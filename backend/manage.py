
"""Django's command-line utility for administrative tasks."""
import os
import sys
import threading

def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    
   
    if 'runserver' in sys.argv:
        try:
            from api.status_checker import start_status_checker
            
            def start_checker():
                import time
                time.sleep(3)  
                start_status_checker()
            
            checker_thread = threading.Thread(target=start_checker, daemon=True)
            checker_thread.start()
        except Exception as e:
            print(f" Impossible de démarrer le status checker: {e}")
    
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
