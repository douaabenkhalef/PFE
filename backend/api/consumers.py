
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
        

class GroupChatConsumer(AsyncWebsocketConsumer):
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
                        print(f"✅ Group chat user authenticated: {user.email}")
            except Exception as e:
                print(f"Token error: {e}")
        
        if user is None:
            await self.close()
            return
        
        self.user = user
        self.group_id = self.scope['url_route']['kwargs']['group_id']
        self.room_group_name = f'group_chat_{self.group_id}'
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        messages = await self.get_group_messages(self.group_id)
        await self.send(text_data=json.dumps({
            'type': 'history',
            'messages': messages
        }))
    
    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type', 'message')
        
        if msg_type == 'message':
            message = data.get('message', '')
            message_type = data.get('message_type', 'text')
            file_data = data.get('file_data', None)
            file_name = data.get('file_name', '')
            
            file_url = ''
            if file_data and message_type in ['image', 'file']:
                file_url = await self.save_file(file_data, file_name, message_type)
            
            saved_msg = await self.save_group_message(
                self.user, self.group_id, message, message_type, file_url, file_name
            )
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'group_message',
                    'message_id': str(saved_msg.id),
                    'message': message,
                    'message_type': message_type,
                    'file_url': file_url,
                    'file_name': file_name,
                    'sender_id': str(self.user.id),
                    'sender_name': self.user.username,
                    'timestamp': datetime.now().isoformat()
                }
            )
    
    async def group_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message_id': event['message_id'],
            'message': event['message'],
            'message_type': event.get('message_type', 'text'),
            'file_url': event.get('file_url', ''),
            'file_name': event.get('file_name', ''),
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'timestamp': event['timestamp']
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
            import base64
            import uuid
            import os
            
            upload_dir = os.path.join(settings.MEDIA_ROOT, 'chat_files')
            os.makedirs(upload_dir, exist_ok=True)
            
            if ',' in file_data:
                imgstr = file_data.split(',')[1]
            else:
                imgstr = file_data
            
            ext = file_name.split('.')[-1] if '.' in file_name else 'png'
            unique_name = f"{uuid.uuid4().hex}.{ext}"
            file_path = os.path.join(upload_dir, unique_name)
            
            with open(file_path, 'wb') as f:
                f.write(base64.b64decode(imgstr))
            
            return f'/media/chat_files/{unique_name}'
        except Exception as e:
            print(f"Erreur sauvegarde fichier: {e}")
            return ''
    
    @database_sync_to_async
    def save_group_message(self, user, group_id, message, message_type, file_url, file_name):
        from .models import GroupChatMessage
        
        msg = GroupChatMessage(
            group_id=group_id,
            sender_id=str(user.id),
            sender_name=user.username,
            message=message,
            message_type=message_type,
            file_url=file_url,
            file_name=file_name,
            created_at=datetime.now()
        )
        msg.save()
        return msg
    
    @database_sync_to_async
    def get_group_messages(self, group_id):
        from .models import GroupChatMessage
        
        messages = GroupChatMessage.objects(
            group_id=group_id
        ).order_by('created_at')[:100]
        
        result = []
        for msg in messages:
            result.append({
                'id': str(msg.id),
                'message': msg.message,
                'message_type': msg.message_type,
                'file_url': msg.file_url,
                'file_name': msg.file_name,
                'sender_id': msg.sender_id,
                'sender_name': msg.sender_name,
                'timestamp': msg.created_at.isoformat(),
                'is_own': msg.sender_id == str(self.user.id)
            })
        return result


class InternshipGroupChatConsumer(AsyncWebsocketConsumer):
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
                        print(f"✅ Internship chat user authenticated: {user.email}")
            except Exception as e:
                print(f"❌ Internship chat token error: {e}")
        
        if user is None:
            print("❌ Internship chat: No valid user, closing connection")
            await self.close()
            return
        
        # السماح للطلاب فقط
        if user.role != 'student':
            print(f"❌ Internship chat: User role {user.role} not allowed, closing connection")
            await self.close()
            return
        
        self.user = user
        self.internship_id = self.scope['url_route']['kwargs']['internship_id']
        self.room_group_name = f'internship_chat_{self.internship_id}'
        
        print(f"🔵 Internship ID from URL: {self.internship_id}")
        
        # التحقق من أن الطالب لديه حق الوصول
        has_access = await self.check_student_access(self.internship_id)
        if not has_access:
            print(f"❌ Student {user.email} does not have access to internship {self.internship_id}")
            await self.close()
            return
        
        print(f"✅ Access granted for internship {self.internship_id}")
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        
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
            
        
            await self.save_message(self.user, message, self.internship_id)
            
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
        from .models import Student
        student = Student.objects(user=user).first()
        return student.full_name if student else user.username
    
    @database_sync_to_async
    def check_student_access(self, internship_id):
        """Vérifie si l'étudiant a accès à ce stage - Accepte Application ID ou Offer ID"""
        from .models import Student, Application
        from bson import ObjectId
        
        student = Student.objects(user=self.user).first()
        if not student:
            print(f"❌ No student profile found for user {self.user.email}")
            return False
        
        try:
            print(f"🔍 Checking access for ID: {internship_id}")
            
            
            try:
                app_id = ObjectId(internship_id)
                application = Application.objects(id=app_id, student=student).first()
                if application:
                    print(f"✅ Found application directly by Application ID!")
                    
                    correct_offer_id = str(application.offer.id)
                    if correct_offer_id != self.internship_id:
                        print(f"🔄 Updating room from {self.internship_id} to {correct_offer_id}")
                        self.internship_id = correct_offer_id
                        self.room_group_name = f'internship_chat_{self.internship_id}'
                    return True
            except:
                pass
            
            
            try:
                offer_id = ObjectId(internship_id)
                application = Application.objects(
                    student=student,
                    offer=offer_id,
                    status__in=['accepted_by_company', 'validated_by_co_dept']
                ).first()
                if application:
                    print(f"✅ Found application via Offer ID!")
                    return True
            except:
                pass
            
            
            all_apps = Application.objects(student=student)
            print(f"📋 Student has {all_apps.count()} applications")
            
            for app in all_apps:
                if app.offer:
                    print(f"   - App ID: {app.id}, Offer ID: {app.offer.id}, Status: {app.status}")
                    
                   
                    if str(app.id) == str(internship_id):
                        print(f"✅ Found match via Application ID!")
                        correct_offer_id = str(app.offer.id)
                        if correct_offer_id != self.internship_id:
                            print(f"🔄 Updating room from {self.internship_id} to {correct_offer_id}")
                            self.internship_id = correct_offer_id
                            self.room_group_name = f'internship_chat_{self.internship_id}'
                        return True
                    
                    
                    if str(app.offer.id) == str(internship_id):
                        print(f"✅ Found match via Offer ID!")
                        return True
            
            print(f"❌ No matching application found")
            return False
            
        except Exception as e:
            print(f"❌ Error checking access: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    @database_sync_to_async
    def save_message(self, user, message, internship_id):
        """حفظ الرسالة في قاعدة البيانات"""
        from .models import ChatMessage
        ChatMessage.objects.create(
            university="Internship",
            user_id=str(user.id),
            username=user.username,
            message=message,
            created_at=datetime.now(),
            internship_id=internship_id
        )
    
    @database_sync_to_async
    def get_recent_messages(self):
        """استرجاع الرسائل السابقة"""
        from .models import ChatMessage
        messages = ChatMessage.objects(
            internship_id=self.internship_id
        ).order_by('-created_at')[:50]
        
        return [{
            'id': str(msg.id),
            'username': msg.username,
            'message': msg.message,
            'timestamp': msg.created_at.isoformat(),
            'user_id': msg.user_id
        } for msg in reversed(messages)]

class CompanyGroupChatConsumer(AsyncWebsocketConsumer):
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
                        print(f"✅ Company chat user authenticated: {user.email}")
            except Exception as e:
                print(f"❌ Company chat token error: {e}")
        
        if user is None:
            print("❌ Company chat: No valid user, closing connection")
            await self.close()
            return
        
        # Vérifier que l'utilisateur est bien une entreprise
        if user.role != 'company':
            print(f"❌ Company chat: User role {user.role} not allowed, closing connection")
            await self.close()
            return
        
        self.user = user
        self.company_name = self.scope['url_route']['kwargs']['company_name']
        self.room_group_name = f'company_chat_{self.company_name}'
        
        print(f"🔵 Company: {self.company_name} -> {self.room_group_name}")
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        print(f"✅ Company WebSocket accepted")
        
        # Récupérer l'historique des messages
        messages = await self.get_recent_messages()
        await self.send(text_data=json.dumps({
            'type': 'history',
            'messages': messages
        }))
        
        # Annoncer que l'utilisateur est en ligne
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_online',
                'username': user.username,
                'full_name': user.username,
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
            
            message_type_field = data.get('message_type', 'text')
            file_data = data.get('file_data', None)
            file_name = data.get('file_name', '')
            
            file_url = ''
            if file_data and message_type_field in ['image', 'file']:
                file_url = await self.save_file(file_data, file_name, message_type_field)
            
            # Sauvegarder le message dans GroupChatMessage
            await self.save_message(self.user, message, message_type_field, file_url, file_name)
            
            # Envoyer le message à tous les membres du groupe
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'message_type': message_type_field,
                    'file_url': file_url,
                    'file_name': file_name,
                    'username': self.user.username,
                    'full_name': self.user.username,
                    'timestamp': datetime.now().isoformat(),
                    'user_id': str(self.user.id),
                    'sender_id': str(self.user.id),
                    'sender_name': self.user.username
                }
            )
    
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message_id': event.get('message_id', None),
            'message': event['message'],
            'message_type': event.get('message_type', 'text'),
            'file_url': event.get('file_url', ''),
            'file_name': event.get('file_name', ''),
            'username': event['username'],
            'full_name': event['full_name'],
            'timestamp': event['timestamp'],
            'user_id': event['user_id'],
            'sender_id': event.get('sender_id', event['user_id']),
            'sender_name': event.get('sender_name', event['username'])
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
    def save_file(self, file_data, file_name, file_type):
        try:
            import base64, uuid, os
            from django.conf import settings
            upload_dir = os.path.join(settings.MEDIA_ROOT, 'chat_files')
            os.makedirs(upload_dir, exist_ok=True)
            
            if ',' in file_data:
                imgstr = file_data.split(',')[1]
            else:
                imgstr = file_data
            
            ext = file_name.split('.')[-1] if '.' in file_name else 'png'
            unique_name = f"{uuid.uuid4().hex}.{ext}"
            file_path = os.path.join(upload_dir, unique_name)
            
            with open(file_path, 'wb') as f:
                f.write(base64.b64decode(imgstr))
            
            return f'/media/chat_files/{unique_name}'
        except Exception as e:
            print(f"Erreur sauvegarde fichier: {e}")
            return ''
    
    @database_sync_to_async
    def save_message(self, user, message, message_type, file_url, file_name):
        from .models import GroupChatMessage
        GroupChatMessage.objects.create(
            group_id=f"company_{self.company_name}",
            sender_id=str(user.id),
            sender_name=user.username,
            message=message,
            message_type=message_type,
            file_url=file_url,
            file_name=file_name,
            created_at=datetime.now()
        )
    
    @database_sync_to_async
    def get_recent_messages(self):
        from .models import GroupChatMessage
        messages = GroupChatMessage.objects(
            group_id=f"company_{self.company_name}"
        ).order_by('created_at')[:100]
        
        result = []
        for msg in messages:
            result.append({
                'id': str(msg.id),
                'message': msg.message,
                'message_type': msg.message_type,
                'file_url': msg.file_url,
                'file_name': msg.file_name,
                'sender_id': msg.sender_id,
                'sender_name': msg.sender_name,
                'username': msg.sender_name,
                'user_id': msg.sender_id,
                'timestamp': msg.created_at.isoformat(),
                'is_own': msg.sender_id == str(self.user.id) if hasattr(self, 'user') else False
            })
        return result


class UniversityGroupChatConsumer(AsyncWebsocketConsumer):
    """Chat de groupe pour une université (Dept Head + Co Dept Heads)"""
    
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
                        print(f"✅ University group chat user authenticated: {user.email}")
            except Exception as e:
                print(f"❌ University group chat token error: {e}")
        
        if user is None:
            print("❌ University group chat: No valid user, closing connection")
            await self.close()
            return
        
        # Vérifier que l'utilisateur est bien un admin
        if user.role != 'admin':
            print(f"❌ University group chat: User role {user.role} not allowed, closing connection")
            await self.close()
            return
        
        self.user = user
        self.university = self.scope['url_route']['kwargs']['university']
        self.room_group_name = f'university_group_{self.university.replace(" ", "_")}'
        
        # Vérifier que l'utilisateur appartient à cette université
        has_access = await self.check_university_access(self.university)
        if not has_access:
            print(f"❌ User {user.email} does not have access to university {self.university}")
            await self.close()
            return
        
        print(f"🔵 University: {self.university} -> {self.room_group_name}")
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        print(f"✅ University WebSocket accepted")
        
        # Récupérer l'historique des messages
        messages = await self.get_group_messages(self.university)
        await self.send(text_data=json.dumps({
            'type': 'history',
            'messages': messages
        }))
        
        # Annoncer que l'utilisateur est en ligne
        full_name = await self.get_user_full_name(user)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_online',
                'username': user.username,
                'full_name': full_name,
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
        msg_type = data.get('type', 'message')
        
        if msg_type == 'message':
            message = data.get('message', '')
            message_type = data.get('message_type', 'text')
            file_data = data.get('file_data', None)
            file_name = data.get('file_name', '')
            
            file_url = ''
            if file_data and message_type in ['image', 'file']:
                file_url = await self.save_file(file_data, file_name, message_type)
            
            full_name = await self.get_user_full_name(self.user)
            
            # Sauvegarder le message dans GroupChatMessage
            saved_msg = await self.save_group_message(
                self.university, self.user, message, message_type, file_url, file_name
            )
            
            # Envoyer le message à tous les membres du groupe
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'group_message',
                    'message_id': str(saved_msg.id),
                    'message': message,
                    'message_type': message_type,
                    'file_url': file_url,
                    'file_name': file_name,
                    'sender_id': str(self.user.id),
                    'sender_name': self.user.username,
                    'full_name': full_name,
                    'timestamp': datetime.now().isoformat()
                }
            )
    
    async def group_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message_id': event['message_id'],
            'message': event['message'],
            'message_type': event.get('message_type', 'text'),
            'file_url': event.get('file_url', ''),
            'file_name': event.get('file_name', ''),
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'full_name': event.get('full_name', event['sender_name']),
            'timestamp': event['timestamp']
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
    def check_university_access(self, university):
        from .models import Admin
        try:
            admin = Admin.objects(user=self.user, university=university).first()
            return admin is not None
        except Exception as e:
            print(f"❌ Error checking university access: {e}")
            return False
    
    @database_sync_to_async
    def save_file(self, file_data, file_name, file_type):
        try:
            import base64, uuid, os
            from django.conf import settings
            upload_dir = os.path.join(settings.MEDIA_ROOT, 'chat_files')
            os.makedirs(upload_dir, exist_ok=True)
            
            if ',' in file_data:
                imgstr = file_data.split(',')[1]
            else:
                imgstr = file_data
            
            ext = file_name.split('.')[-1] if '.' in file_name else 'png'
            unique_name = f"{uuid.uuid4().hex}.{ext}"
            file_path = os.path.join(upload_dir, unique_name)
            
            with open(file_path, 'wb') as f:
                f.write(base64.b64decode(imgstr))
            
            return f'/media/chat_files/{unique_name}'
        except Exception as e:
            print(f"Erreur sauvegarde fichier: {e}")
            return ''
    
    @database_sync_to_async
    def save_group_message(self, university, user, message, message_type, file_url, file_name):
        from .models import GroupChatMessage
        msg = GroupChatMessage(
            group_id=f"university_{university.replace(' ', '_')}",
            sender_id=str(user.id),
            sender_name=user.username,
            message=message,
            message_type=message_type,
            file_url=file_url,
            file_name=file_name,
            created_at=datetime.now()
        )
        msg.save()
        return msg
    
    @database_sync_to_async
    def get_group_messages(self, university):
        from .models import GroupChatMessage
        messages = GroupChatMessage.objects(
            group_id=f"university_{university.replace(' ', '_')}"
        ).order_by('created_at')[:100]
        
        result = []
        for msg in messages:
            result.append({
                'id': str(msg.id),
                'message': msg.message,
                'message_type': msg.message_type,
                'file_url': msg.file_url,
                'file_name': msg.file_name,
                'sender_id': msg.sender_id,
                'sender_name': msg.sender_name,
                'timestamp': msg.created_at.isoformat(),
                'is_own': msg.sender_id == str(self.user.id) if hasattr(self, 'user') else False
            })
        return result