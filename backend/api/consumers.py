# backend/api/consumers.py
import json
import re
import base64
import os
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from datetime import datetime
from django.conf import settings

def sanitize_group_name(name):
    """
    Nettoie le nom du groupe pour n'avoir que des caractères ASCII valides
    """
    replacements = {
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'à': 'a', 'â': 'a', 'ä': 'a',
        'î': 'i', 'ï': 'i',
        'ô': 'o', 'ö': 'o',
        'ù': 'u', 'û': 'u', 'ü': 'u',
        'ç': 'c',
        'œ': 'oe',
        'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
        'À': 'A', 'Â': 'A', 'Ä': 'A',
        'Î': 'I', 'Ï': 'I',
        'Ô': 'O', 'Ö': 'O',
        'Ù': 'U', 'Û': 'U', 'Ü': 'U',
        'Ç': 'C',
    }
    
    for accented, unaccented in replacements.items():
        name = name.replace(accented, unaccented)
    
    name = re.sub(r'[^a-zA-Z0-9_-]', '_', name)
    
    if len(name) > 90:
        name = name[:90]
    
    return name


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        query_string = self.scope['query_string'].decode()
        token = None
        if 'token=' in query_string:
            token = query_string.split('token=')[1].split('&')[0]
        
        user = None
        
        if token:
            try:
                import jwt
                from django.conf import settings
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
                user_id = payload.get('user_id')
                if user_id:
                    user = await self.get_user_by_id(user_id)
                    if user:
                        print(f"✅ User authenticated: {user.email}")
                    else:
                        print(f"❌ User not found for id: {user_id}")
            except jwt.ExpiredSignatureError:
                print("❌ Token expired")
            except jwt.InvalidTokenError as e:
                print(f"❌ Invalid token: {e}")
            except Exception as e:
                print(f"❌ Token decode error: {e}")
        
        if user is None:
            print("❌ No valid user, closing connection")
            await self.close()
            return
        
        self.user = user
        
        university_name = self.scope['url_route']['kwargs']['university_name']
        clean_name = sanitize_group_name(university_name)
        self.room_group_name = f'chat_{clean_name}'
        
        print(f"🔵 University: {university_name} -> {self.room_group_name}")
        
        if user.role != 'admin':
            print(f"❌ User role {user.role} not allowed, closing connection")
            await self.close()
            return
        
        print(f"✅ User {user.username} joining group {self.room_group_name}")
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        print(f"✅ WebSocket accepted")
        
        messages = await self.get_recent_messages()
        await self.send(text_data=json.dumps({
            'type': 'history',
            'messages': messages
        }))
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_online',
                'username': user.username,
                'full_name': await self.get_user_full_name(user),
                'is_online': True
            }
        )
    
    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name') and hasattr(self, 'user') and self.user:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_offline',
                    'username': self.user.username,
                    'is_online': False
                }
            )
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type', 'message')
        
        if message_type == 'message':
            message = data.get('message', '')
            if not hasattr(self, 'user') or not self.user:
                return
            
            full_name = await self.get_user_full_name(self.user)
            
            await self.save_message(self.user, message)
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'username': self.user.username,
                    'full_name': full_name,
                    'timestamp': datetime.now().isoformat(),
                    'user_id': str(self.user.id)
                }
            )
    
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': event['message'],
            'username': event['username'],
            'full_name': event['full_name'],
            'timestamp': event['timestamp'],
            'user_id': event['user_id']
        }))
    
    async def user_online(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_online',
            'username': event['username'],
            'full_name': event.get('full_name', event['username']),
            'is_online': True
        }))
    
    async def user_offline(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_offline',
            'username': event['username'],
            'is_online': False
        }))
    
    @database_sync_to_async
    def get_user_by_id(self, user_id):
        from .models import User
        try:
            return User.objects(id=user_id).first()
        except Exception:
            return None
    
    @database_sync_to_async
    def get_user_full_name(self, user):
        from .models import Admin
        admin = Admin.objects(user=user).first()
        return admin.full_name if admin else user.username
    
    @database_sync_to_async
    def save_message(self, user, message):
        from .models import ChatMessage
        ChatMessage.objects.create(
            university="Universite",
            user_id=str(user.id),
            username=user.username,
            message=message,
            created_at=datetime.now()
        )
    
    @database_sync_to_async
    def get_recent_messages(self):
        from .models import ChatMessage
        messages = ChatMessage.objects().order_by('-created_at')[:50]
        
        return [{
            'id': str(msg.id),
            'username': msg.username,
            'message': msg.message,
            'timestamp': msg.created_at.isoformat(),
            'user_id': msg.user_id
        } for msg in reversed(messages)]


class PrivateChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        query_string = self.scope['query_string'].decode()
        token = None
        if 'token=' in query_string:
            token = query_string.split('token=')[1].split('&')[0]
        
        user = None
        
        if token:
            try:
                import jwt
                from django.conf import settings
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
                user_id = payload.get('user_id')
                if user_id:
                    user = await self.get_user_by_id(user_id)
                    if user:
                        print(f"✅ Private chat user authenticated: {user.email}")
            except Exception as e:
                print(f"❌ Private chat token error: {e}")
        
        if user is None:
            print("❌ Private chat: No valid user, closing connection")
            await self.close()
            return
        
        self.user = user
        self.user_id = str(user.id)
        self.room_group_name = f'private_chat_{self.user_id}'
        
        print(f"✅ Private chat connected for user {user.username}")
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        unread_messages = await self.get_unread_messages()
        for msg in unread_messages:
            await self.send(text_data=json.dumps({
                'type': 'private_message',
                'message_id': msg['id'],
                'from_user_id': msg['sender_id'],
                'from_user_name': msg['sender_name'],
                'message': msg['message'],
                'message_type': msg.get('message_type', 'text'),
                'file_url': msg.get('file_url', ''),
                'file_name': msg.get('file_name', ''),
                'timestamp': msg['timestamp'],
                'is_unread': True
            }))
    
    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type', '')
        
        if msg_type == 'private_message':
            receiver_id = data.get('receiver_id')
            message = data.get('message', '')
            message_type = data.get('message_type', 'text')
            file_data = data.get('file_data', None)
            file_name = data.get('file_name', '')
            
            if not receiver_id:
                return
            
            receiver = await self.get_user_by_id(receiver_id)
            if not receiver:
                return
            
            file_url = ''
            if file_data and message_type in ['image', 'file']:
                file_url = await self.save_file(file_data, file_name, message_type)
            
            saved_msg = await self.save_private_message(
                self.user, receiver, message, message_type, file_url, file_name
            )
            
            await self.channel_layer.group_send(
                f'private_chat_{receiver_id}',
                {
                    'type': 'private_message',
                    'message_id': str(saved_msg.id),
                    'from_user_id': self.user_id,
                    'from_user_name': self.user.username,
                    'message': message,
                    'message_type': message_type,
                    'file_url': file_url,
                    'file_name': file_name,
                    'timestamp': datetime.now().isoformat(),
                    'is_unread': True
                }
            )
            
            await self.send(text_data=json.dumps({
                'type': 'message_sent',
                'to_user_id': receiver_id,
                'to_user_name': receiver.username,
                'message': message,
                'message_type': message_type,
                'file_url': file_url,
                'file_name': file_name,
                'timestamp': datetime.now().isoformat()
            }))
        
        elif msg_type == 'typing':
            receiver_id = data.get('receiver_id')
            is_typing = data.get('is_typing', False)
            
            if receiver_id:
                await self.channel_layer.group_send(
                    f'private_chat_{receiver_id}',
                    {
                        'type': 'user_typing',
                        'from_user_id': self.user_id,
                        'from_user_name': self.user.username,
                        'is_typing': is_typing
                    }
                )
        
        elif msg_type == 'mark_as_read':
            message_id = data.get('message_id')
            if message_id:
                await self.mark_message_as_read(message_id)
        
        elif msg_type == 'get_history':
            other_user_id = data.get('with_user_id')
            if other_user_id:
                history = await self.get_conversation_history(other_user_id)
                print(f"📜 Envoi de l'historique: {len(history)} messages")
                await self.send(text_data=json.dumps({
                    'type': 'history',
                    'messages': history
                }))
    
    async def user_typing(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_typing',
            'from_user_id': event['from_user_id'],
            'from_user_name': event['from_user_name'],
            'is_typing': event['is_typing']
        }))
    
    async def private_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'private_message',
            'message_id': event['message_id'],
            'from_user_id': event['from_user_id'],
            'from_user_name': event['from_user_name'],
            'message': event['message'],
            'message_type': event.get('message_type', 'text'),
            'file_url': event.get('file_url', ''),
            'file_name': event.get('file_name', ''),
            'timestamp': event['timestamp'],
            'is_unread': event.get('is_unread', False)
        }))
    
    @database_sync_to_async
    def get_user_by_id(self, user_id):
        from .models import User
        try:
            return User.objects(id=user_id).first()
        except Exception:
            return None
    
    @database_sync_to_async
    def save_file(self, file_data, file_name, file_type):
        try:
            upload_dir = os.path.join(settings.MEDIA_ROOT, 'chat_files')
            os.makedirs(upload_dir, exist_ok=True)
            
            if ',' in file_data:
                format, imgstr = file_data.split(';base64,')
                ext = file_name.split('.')[-1] if '.' in file_name else 'png'
            else:
                imgstr = file_data
                ext = 'png'
            
            unique_name = f"{uuid.uuid4().hex}.{ext}"
            file_path = os.path.join(upload_dir, unique_name)
            
            with open(file_path, 'wb') as f:
                f.write(base64.b64decode(imgstr))
            
            return f'/media/chat_files/{unique_name}'
        except Exception as e:
            print(f"Erreur sauvegarde fichier: {e}")
            return ''
    
    @database_sync_to_async
    def save_private_message(self, sender, receiver, message, message_type, file_url, file_name):
        from .models import PrivateChatMessage
        from .models import Admin
        
        admin = Admin.objects(user=sender).first()
        university = admin.university if admin else "Universite"
        
        msg = PrivateChatMessage(
            sender_id=str(sender.id),
            sender_name=sender.username,
            receiver_id=str(receiver.id),
            receiver_name=receiver.username,
            university=university,
            message=message,
            message_type=message_type,
            file_url=file_url,
            file_name=file_name,
            is_read=False,
            created_at=datetime.now()
        )
        msg.save()
        print(f"💾 Message sauvegardé: {sender.username} -> {receiver.username}: {message[:30]}")
        return msg
    
    @database_sync_to_async
    def get_unread_messages(self):
        from .models import PrivateChatMessage
        messages = PrivateChatMessage.objects(
            receiver_id=self.user_id,
            is_read=False
        ).order_by('created_at')
        
        result = []
        for msg in messages:
            result.append({
                'id': str(msg.id),
                'sender_id': msg.sender_id,
                'sender_name': msg.sender_name,
                'message': msg.message,
                'message_type': msg.message_type,
                'file_url': msg.file_url,
                'file_name': msg.file_name,
                'timestamp': msg.created_at.isoformat()
            })
        return result
    
    @database_sync_to_async
    def mark_message_as_read(self, message_id):
        from .models import PrivateChatMessage
        try:
            msg = PrivateChatMessage.objects(id=message_id).first()
            if msg and msg.receiver_id == self.user_id:
                msg.is_read = True
                msg.save()
        except Exception:
            pass
    
    @database_sync_to_async
    def get_conversation_history(self, other_user_id):
        """Récupère TOUS les messages entre les deux utilisateurs (dans les deux sens)"""
        from .models import PrivateChatMessage
        import logging
        
        logger = logging.getLogger(__name__)
        
        try:
            messages = PrivateChatMessage.objects(
                __raw__={
                    '$or': [
                        {'sender_id': self.user_id, 'receiver_id': other_user_id},
                        {'sender_id': other_user_id, 'receiver_id': self.user_id}
                    ]
                }
            ).order_by('created_at')
            
            logger.info(f"📜 Historique: {messages.count()} messages entre {self.user_id} et {other_user_id}")
            
            result = []
            for msg in messages:
                result.append({
                    'id': str(msg.id),
                    'sender_id': msg.sender_id,
                    'sender_name': msg.sender_name,
                    'receiver_id': msg.receiver_id,
                    'message': msg.message,
                    'message_type': msg.message_type,
                    'file_url': msg.file_url,
                    'file_name': msg.file_name,
                    'timestamp': msg.created_at.isoformat(),
                    'is_own': msg.sender_id == self.user_id,
                    'is_read': msg.is_read
                })
                
            return result
        except Exception as e:
            logger.error(f"❌ Erreur get_conversation_history: {e}")
            return []