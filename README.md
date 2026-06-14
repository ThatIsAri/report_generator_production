# Автоматическое формирование отчетности

Веб-приложение на Flask + MySQL для создания, редактирования, предпросмотра и экспорта отчетов и шаблонов.

## Стек

- Python Flask
- MySQL / XAMPP
- HTML, CSS, JavaScript
- SQLAlchemy
- pytest

## Быстрый запуск

1. Создайте виртуальное окружение:
   ```powershell
   py -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

2. Установите зависимости:
   ```powershell
   py -m pip install -r requirements.txt
   ```

3. Создайте локальный `.env` из примера:
   ```powershell
   Copy-Item .env.example .env
   ```

4. Заполните параметры базы данных в `.env`.

5. Запустите MySQL в XAMPP и создайте базу:
   ```sql
   CREATE DATABASE ft_reports_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

6. Инициализируйте таблицы:
   ```powershell
   py -m flask --app app.py init-db
   ```

7. Запустите приложение:
   ```powershell
   py app.py
   ```

По умолчанию приложение доступно на `http://127.0.0.1:5000`.

## Тесты

```powershell
py -m pytest -q
```

## Важно 

Для публичной публикации задайте собственные значения:

- `SECRET_KEY`
- параметры MySQL
- ключи Yandex SmartCaptcha, если капча включена

