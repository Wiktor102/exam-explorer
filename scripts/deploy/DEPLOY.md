# Wdrożenie lokalne na produkcję

Polecenia uruchamiaj z głównego katalogu repozytorium.

```bash
pnpm deploy:prod
```

Polecenie wdraża ostatni lokalny commit `HEAD` na
`https://egzamin-zawodowy.wiktorgolicz.pl`, bez GitHub Actions. Nie pobiera zmian
z GitHuba. Buduje aplikację w katalogu tymczasowym z zależnościami z lockfile'a
i pobiera załączniki egzaminacyjne. Niezacommitowane zmiany i pliki spoza Gita
nie trafiają do wdrożenia.

Wymagane są Node.js 24, pnpm 11.6.0, Python 3, Git, `tar`, `rsync` i SSH.
Na serwerze skrypt korzysta z Pythona 3. Uwierzytelnianie działa przez lokalny
agent SSH lub klucze z `~/.ssh`. Przed pierwszym wdrożeniem sprawdź połączenie
i zweryfikuj klucz hosta przez `ssh wiktor102@s81.mydevil.net`.
Opcjonalnie wskaż osobny klucz:

```bash
MYDEVIL_SSH_KEY=~/.ssh/mydevil pnpm deploy:prod
```

Sprawdzenie samego buildu i pobierania załączników, bez połączenia z produkcją:

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
zostaje na serwerze w `~/domains/egzamin-zawodowy.wiktorgolicz.pl/public_html.before-*`.
Skrypt wypisuje jej dokładną ścieżkę; starsze kopie nie są automatycznie usuwane.
Niezmienione pliki kopiuje na serwerze z bieżącej wersji, aby ograniczyć transfer.

