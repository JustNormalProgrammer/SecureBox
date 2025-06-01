const { exec } = require('child_process');
const cron = require('node-cron');

/**
 * Harmonogram codziennego backupu plików i bazy danych PostgreSQL.
 * Backup wykonywany jest codziennie o godzinie 2:00 w nocy.
 * 
 * - Tworzy backup plików z katalogu `/app/source/files`
 * - Tworzy backup bazy danych PostgreSQL o nazwie `Menadzer_hasel`
 * - Ustawia uprawnienia 600 na utworzonych plikach backupu
 * - Usuwa backupy starsze niż 7 dni
 */
cron.schedule('0 2 * * *', () => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const oldDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');

  const fileBackup = `/app/backup/files_backup_${today}.tar.gz`;
  const dbBackup = `/app/backup/db_backup_${today}.tar`;
  const oldFileBackup = `/app/backup/files_backup_${oldDate}.tar.gz`;
  const oldDbBackup = `/app/backup/db_backup_${oldDate}.tar`;

  const dbName = 'Menadzer_hasel';

  console.log('Backup wystartował...');

  /**
   * Tworzy skompresowany backup plików z katalogu źródłowego.
   * Ustawia uprawnienia 600 na pliku.
   */
  exec(`tar -czf ${fileBackup} /app/source/files && chmod 600 ${fileBackup}`, (err) => {
    if (err) console.error('Błąd backupu plików:', err.message);
    else console.log('Pliki zbackupowane');
  });

  /**
   * Tworzy backup bazy danych PostgreSQL w formacie tar.
   * Ustawia uprawnienia 600 na pliku.
   */
  exec(`pg_dump -U postgres -F tar -f ${dbBackup} ${dbName} && chmod 600 ${dbBackup}`, (err) => {
    if (err) console.error('Błąd backupu bazy:', err.message);
    else console.log('Baza zbackupowana');
  });

  /**
   * Usuwa pliki backupów starsze niż 7 dni.
   */
  exec(`rm -f ${oldFileBackup} ${oldDbBackup}`, (err) => {
    if (err) console.error('Błąd usuwania starych backupów:', err.message);
    else console.log('Stare backupy usunięte');
  });
});
