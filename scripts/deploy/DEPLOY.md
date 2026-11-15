# Wdrożenie lokalne na produkcję

Polecenia uruchamiaj z głównego katalogu repozytorium.

Skopiuj plik konfiguracji i uzupełnij adres SSH, katalog domeny oraz URL produkcji:

```bash
cp scripts/deploy/.env.example scripts/deploy/.env
```

Plik `scripts/deploy/.env` jest ignorowany przez Git. Skrypt odczytuje go ze
swojego katalogu, niezależnie od bieżącego katalogu terminala. Wartości ze
spacjami ujmuj w cudzysłowy. Zmienne nie są rozwijane przez powłokę.

```bash
pnpm deploy:prod
```

Polecenie wdraża ostatni lokalny commit `HEAD` na
adres `MYDEVIL_PRODUCTION_URL` z pliku `.env`, bez GitHub Actions. Nie pobiera zmian
z GitHuba. Buduje aplikację w katalogu tymczasowym z zależnościami z lockfile'a
i pobiera załączniki egzaminacyjne. Niezacommitowane zmiany i pliki spoza Gita
nie trafiają do wdrożenia.

Wymagane są Node.js 24, pnpm 11.6.0, Python 3, Git, `tar`, `rsync` i SSH.
Na serwerze skrypt korzysta z Pythona 3. Uwierzytelnianie działa przez lokalny
agent SSH lub klucze z `~/.ssh`. Przed pierwszym wdrożeniem sprawdź połączenie
i zweryfikuj klucz hosta przez `ssh user@server`, używając adresu z `MYDEVIL_HOST`.
Opcjonalnie wskaż osobny klucz w pliku `.env`:

```bash
MYDEVIL_SSH_KEY=~/.ssh/mydevil
```

Sprawdzenie samego buildu i pobierania załączników, bez połączenia z produkcją i bez pliku `.env`:

```bash
pnpm deploy:prod --dry-run
```

Konkretny lokalny commit lub gałąź można wskazać przez
`pnpm deploy:prod --ref main`. Aby wdrożyć najnowszy commit z GitHuba,
najpierw pobierz go przez `git fetch origin`, a następnie uruchom
`pnpm deploy:prod --ref origin/main`.

Skrypt blokuje równoległe lokalne wdrożenia, przesyła pliki do osobnego
katalogu i porównuje ich sumy SHA-256. Następnie przełącza katalog
`public_html` i sprawdza przez HTTPS stronę główną, katalogi oraz pliki JS i CSS.
Nieudana weryfikacja przywraca poprzednią wersję. Kopia poprzedniej wersji
zostaje na serwerze w `MYDEVIL_DOMAIN_DIRECTORY/public_html.before-*`.
Skrypt wypisuje jej dokładną ścieżkę; starsze kopie nie są automatycznie usuwane.
Niezmienione pliki kopiuje na serwerze z bieżącej wersji, aby ograniczyć transfer.

