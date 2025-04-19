# SecureBox - password manager

## Endpoints

### User Authentication Endpoints

#### POST /login
- **Opis**: Uwierzytelnia użytkownika i zwraca token JWT.
- **Żądanie**:
  - **Body**:
    - `login` (string): Login użytkownika.
    - `password` (string): Hasło użytkownika.
- **Odpowiedź**:
  - **Body**:
    - `user` (object):
      - `id` (string): ID użytkownika.
      - `first_name` (string): Imię użytkownika.
      - `last_name` (string): Nazwisko użytkownika.
      - `login` (string): Login użytkownika.
    - `token` (string): Token JWT.

### User Management Endpoints

#### POST /users
- **Opis**: Tworzy nowego użytkownika.
- **Żądanie**:
  - **Body**:
    - `first_name` (string): Imię użytkownika.
    - `last_name` (string): Nazwisko użytkownika.
    - `login` (string): Login użytkownika.
    - `password` (string): Hasło użytkownika.
- **Odpowiedź**:
  - **Body**:
    - `id` (string): ID nowo utworzonego użytkownika.
    - `first_name` (string): Imię użytkownika.
    - `last_name` (string): Nazwisko użytkownika.
    - `login` (string): Login użytkownika.

#### PATCH /users/:user_id
- **Opis**: Aktualizuje dane użytkownika.
- **Żądanie**:
  - **Parametry**:
    - `user_id` (string): ID użytkownika.
  - **Body**:
    - `first_name` (string, opcjonalne): Nowe imię użytkownika.
    - `last_name` (string, opcjonalne): Nowe nazwisko użytkownika.
    - `login` (string, opcjonalne): Nowy login użytkownika.
    - `password` (string, opcjonalne): Nowe hasło użytkownika.
- **Odpowiedź**:
  - **Body**:
    - `id` (string): ID użytkownika.
    - `first_name` (string): Imię użytkownika.
    - `last_name` (string): Nazwisko użytkownika.
    - `login` (string): Login użytkownika.

#### GET /users/:user_id
- **Opis**: Pobiera dane użytkownika.
- **Żądanie**:
  - **Parametry**:
    - `user_id` (string): ID użytkownika.
- **Odpowiedź**:
  - **Body**:
    - `id` (string): ID użytkownika.
    - `first_name` (string): Imię użytkownika.
    - `last_name` (string): Nazwisko użytkownika.
    - `login` (string): Login użytkownika.

#### GET /users/me/get
- **Opis**: Pobiera dane zalogowanego użytkownika.
- **Żądanie**: Brak.
- **Odpowiedź**:
  - **Body**:
    - `id` (string): ID użytkownika.
    - `first_name` (string): Imię użytkownika.
    - `last_name` (string): Nazwisko użytkownika.
    - `login` (string): Login użytkownika.

#### GET /users/:user_id/logins
- **Opis**: Pobiera historię logowań użytkownika.
- **Żądanie**:
  - **Parametry**:
    - `user_id` (string): ID użytkownika.
- **Odpowiedź**:
  - **Body**:
    - `logins` (array): Lista logowań użytkownika.
      - `timestamp` (string): Czas logowania.
      - `user_id` (string): ID użytkownika.
      - `login` (string): Login użytkownika.
      - `page` (string): Strona, na którą zalogowano.

#### POST /users/:user_id/logins
- **Opis**: Dodaje wpis do historii logowań użytkownika.
- **Żądanie**:
  - **Parametry**:
    - `user_id` (string): ID użytkownika.
  - **Body**:
    - `login` (string): Login użytkownika.
    - `page` (string): Strona, na którą zalogowano.
- **Odpowiedź**:
  - **Body**:
    - `timestamp` (string): Czas logowania.
    - `user_id` (string): ID użytkownika.
    - `login` (string): Login użytkownika.
    - `page` (string): Strona, na którą zalogowano.

### Password Management Endpoints

#### GET /passwords
- **Opis**: Pobiera wszystkie hasła użytkownika.
- **Żądanie**: Brak.
- **Odpowiedź**:
  - **Body**:
    - `passwords` (array): Lista haseł użytkownika.
      - `id` (string): ID hasła.
      - `passwordfile` (string): Nazwa pliku z hasłem.
      - `logo` (string): Logo platformy.
      - `platform` (string): Nazwa platformy.
      - `login` (string): Login użytkownika.
      - `user_id` (string): ID użytkownika.

#### GET /passwords/:user_id/files
- **Opis**: Pobiera wszystkie pliki z hasłami użytkownika w formacie ZIP.
- **Żądanie**:
  - **Parametry**:
    - `user_id` (string): ID użytkownika.
- **Odpowiedź**: Plik ZIP zawierający wszystkie pliki z hasłami użytkownika.

#### POST /passwords/:user_id/files
- **Opis**: Dodaje nowe hasło użytkownika.
- **Żądanie**:
  - **Parametry**:
    - `user_id` (string): ID użytkownika.
  - **Body**:
    - `password` (string): Hasło użytkownika.
    - `platform` (string): Nazwa platformy.
    - `login` (string): Login użytkownika.
    - `logo` (string): Logo platformy.
- **Odpowiedź**:
  - **Body**:
    - `id` (string): ID hasła.
    - `passwordfile` (string): Nazwa pliku z hasłem.
    - `logo` (string): Logo platformy.
    - `platform` (string): Nazwa platformy.
    - `login` (string): Login użytkownika.
    - `user_id` (string): ID użytkownika.

#### PUT /passwords/:user_id/passwords/:platform/:login
- **Opis**: Aktualizuje hasło użytkownika.
- **Żądanie**:
  - **Parametry**:
    - `user_id` (string): ID użytkownika.
    - `platform` (string): Nazwa platformy.
    - `login` (string): Login użytkownika.
  - **Body**:
    - `new_password` (string): Nowe hasło użytkownika.
- **Odpowiedź**:
  - **Body**:
    - `id` (string): ID hasła.
    - `passwordfile` (string): Nazwa pliku z hasłem.
    - `logo` (string): Logo platformy.
    - `platform` (string): Nazwa platformy.
    - `login` (string): Login użytkownika.
    - `user_id` (string): ID użytkownika.

#### DELETE /passwords/:user_id/passwords/:platform/:login
- **Opis**: Usuwa hasło użytkownika.
- **Żądanie**:
  - **Parametry**:
    - `user_id` (string): ID użytkownika.
    - `platform` (string): Nazwa platformy.
    - `login` (string): Login użytkownika.
- **Odpowiedź**:
  - **Body**:
    - `message` (string): Wiadomość potwierdzająca usunięcie hasła.

#### PUT /passwords/:user_id/passwords
- **Opis**: Aktualizuje wszystkie hasła użytkownika.
- **Żądanie**:
  - **Parametry**:
    - `user_id` (string): ID użytkownika.
  - **Body**:
    - `passwordsall` (array): Lista haseł do zaktualizowania.
      - `platform` (string): Nazwa platformy.
      - `login` (string): Login użytkownika.
      - `new_password` (string): Nowe hasło użytkownika.
- **Odpowiedź**:
  - **Body**:
    - `updatedEntries` (array): Lista zaktualizowanych haseł.
      - `id` (string): ID hasła.
      - `passwordfile` (string): Nazwa pliku z hasłem.
      - `logo` (string): Logo platformy.
      - `platform` (string): Nazwa platformy.
      - `login` (string): Login użytkownika.
      - `user_id` (string): ID użytkownika.

### Trusted Device Management Endpoints

#### GET /users/:user_id/trusted-devices
- **Opis**: Pobiera listę zaufanych urządzeń użytkownika.
- **Żądanie**:
  - **Parametry**:
    - `user_id` (string): ID użytkownika.
- **Odpowiedź**:
  - **Body**:
    - `devices` (array): Lista zaufanych urządzeń użytkownika.
      - `user_id` (string): ID użytkownika.
      - `device_id` (string): ID urządzenia.
      - `user_agent` (string): User agent urządzenia.
      - `is_trusted` (boolean): Czy urządzenie jest zaufane.

#### PATCH /users/:user_id/trusted-devices
- **Opis**: Aktualizuje zaufane urządzenie użytkownika.
- **Żądanie**:
  - **Parametry**:
    - `user_id` (string): ID użytkownika.
  - **Body**:
    - `device_id` (string): ID urządzenia.
    - `user_agent` (string): User agent urządzenia.
    - `is_trusted` (boolean): Czy urządzenie jest zaufane.
- **Odpowiedź**:
  - **Body**:
    - `user_id` (string): ID użytkownika.
    - `device_id` (string): ID urządzenia.
    - `user_agent` (string): User agent urządzenia.
    - `is_trusted` (boolean): Czy urządzenie jest zaufane.

#### DELETE /users/:user_id/trusted-devices/:device_id
- **Opis**: Usuwa zaufane urządzenie użytkownika.
- **Żądanie**:
  - **Parametry**:
    - `user_id` (string): ID użytkownika.
    - `device_id` (string): ID urządzenia.
- **Odpowiedź**:
  - **Body**:
    - `message` (string): Wiadomość potwierdzająca usunięcie urządzenia z listy zaufanych.
