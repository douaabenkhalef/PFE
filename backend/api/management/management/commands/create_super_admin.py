# backend/api/management/commands/create_super_admin.py

from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from api.models import User, SuperAdmin
from datetime import datetime
import bcrypt

class Command(BaseCommand):
    help = 'Create a super admin user with full system access'

    def add_arguments(self, parser):
        """
       
        """
        parser.add_argument(
            '--email',
            type=str,
            required=True,
            help='Super admin email address (required)'
        )
        parser.add_argument(
            '--password',
            type=str,
            required=True,
            help='Super admin password (required)'
        )
        parser.add_argument(
            '--name',
            type=str,
            default='Super Administrator',
            help='Full name of the super admin (default: Super Administrator)'
        )
        parser.add_argument(
            '--username',
            type=str,
            default='super_admin',
            help='Username for the super admin (default: super_admin)'
        )

    def handle(self, *args, **options):
        """
       
        """
        email = options['email']
        password = options['password']
        name = options['name']
        username = options['username']

        self.stdout.write(self.style.SUCCESS(f'\n🚀 Creating Super Admin...'))
        self.stdout.write(f'   📧 Email: {email}')
        self.stdout.write(f'   👤 Name: {name}')
        self.stdout.write(f'   🔑 Username: {username}')
        self.stdout.write('   ' + '='*40 + '\n')

        # ========== التحقق من وجود المستخدم مسبقاً ==========
        existing_user = User.objects(email=email).first()
        
        if existing_user:
            if existing_user.is_super_admin:
                self.stdout.write(self.style.WARNING(f'⚠️  Super Admin with email "{email}" already exists!'))
                self.stdout.write(self.style.WARNING(f'   User ID: {existing_user.id}'))
                self.stdout.write(self.style.WARNING(f'   Status: {"Active" if existing_user.status else "Inactive"}'))
                return
            else:
                self.stdout.write(self.style.WARNING(f'⚠️  A regular user with email "{email}" already exists!'))
                self.stdout.write(self.style.WARNING(f'   Role: {existing_user.role}'))
                self.stdout.write(self.style.WARNING(f'   Do you want to upgrade this user to Super Admin? (y/n)'))
                
                # طلب تأكيد من المستخدم
                confirm = input().lower()
                if confirm != 'y':
                    self.stdout.write(self.style.ERROR('❌ Operation cancelled.'))
                    return
                
                self.stdout.write(self.style.SUCCESS('   Upgrading user to Super Admin...'))
                existing_user.is_super_admin = True
                existing_user.role = 'super_admin'
                existing_user.sub_role = 'super_admin'
                existing_user.status = True
                existing_user.save()
                
                # التحقق من وجود SuperAdmin profile
                super_admin = SuperAdmin.objects(user=existing_user).first()
                if not super_admin:
                    super_admin = SuperAdmin(
                        user=existing_user,
                        full_name=name,
                        email=email,
                        created_at=datetime.now()
                    )
                    super_admin.save()
                
                self.stdout.write(self.style.SUCCESS(f'\n✅ User "{email}" upgraded to Super Admin successfully!'))
                return

        # ========== إنشاء مستخدم جديد ==========
        self.stdout.write(self.style.SUCCESS('   Creating new user...'))
        
        try:
            # إنشاء المستخدم
            user = User(
                username=username,
                email=email,
                role='super_admin',
                sub_role='super_admin',
                status=True,
                is_super_admin=True,
                created_at=datetime.now()
            )
            user.set_password(password)
            user.save()
            
            self.stdout.write(self.style.SUCCESS(f'   ✅ User created with ID: {user.id}'))

            
            self.stdout.write('   Creating Super Admin profile...')
            
            super_admin = SuperAdmin(
                user=user,
                full_name=name,
                email=email,
                created_at=datetime.now()
            )
            super_admin.save()
            
            self.stdout.write(self.style.SUCCESS(f'   ✅ Super Admin profile created with ID: {super_admin.id}'))

            
            self.stdout.write(self.style.SUCCESS('\n' + '='*50))
            self.stdout.write(self.style.SUCCESS('✅ SUPER ADMIN CREATED SUCCESSFULLY!'))
            self.stdout.write(self.style.SUCCESS('='*50))
            self.stdout.write(f'   📧 Email    : {email}')
            self.stdout.write(f'   👤 Name     : {name}')
            self.stdout.write(f'   🔑 Username : {username}')
            self.stdout.write(f'   🔐 Password : {password}')
            self.stdout.write(f'   🆔 User ID  : {user.id}')
            self.stdout.write(f'   📅 Created  : {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
            self.stdout.write(self.style.SUCCESS('='*50))
            self.stdout.write('\n🔐 You can now login at: /super-admin/dashboard')
            self.stdout.write('   Each login will require OTP verification.\n')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Error creating Super Admin: {str(e)}'))
            raise CommandError(f'Failed to create Super Admin: {str(e)}')