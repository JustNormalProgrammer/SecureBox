/*const filehandler = require('../utils/fileHandler');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const sinon = require('sinon');
const archiver = require("archiver");


let newDesiredFile;
let desiredFile;
let resMock;
let archiveStub;

describe('Testowanie funkcji fileHandler', function() {
  
    

    it('1. Tworzenie pliku z hasłem', async function() {
      await filehandler.createPasswordFile('0', 'haslo');
      desiredFile = path.join(__dirname, '../files/0/abe31fe1.txt');
      expect(fs.existsSync(desiredFile)).toBe(true);
    });
  
    it('2. Aktualizacja pliku z hasłem', async function() {
      newDesiredFile = path.join(__dirname, '../files/0/49673d1f.txt');
      await filehandler.updatePasswordFile('0', 'abe31fe1.txt', 'nowehaslo');
      expect(fs.existsSync(newDesiredFile)).toBe(true);
      expect(fs.existsSync(desiredFile)).toBe(false);
    });
  
    it('3. Usuwanie pliku z hasłem', async() => {
      await filehandler.deletePasswordFile('0', '49673d1f.txt');

    let fileStillExists = true;
    try {
      await fs.promises.access(newDesiredFile);
    } catch (err) {
      fileStillExists = false;
    }

    expect(fileStillExists).toBe(false);

    });
  
    
    beforeEach(() => {
      // Tworzymy fake stream do response
      resMock = {
        attachment: sinon.stub(),
        write: sinon.stub(),
        end: sinon.stub()
      };
  
      // Stub metody archiver: directory, pipe i finalize
      archiveStub = {
        directory: sinon.stub().returnsThis(),
        pipe: sinon.stub(),
        finalize: sinon.stub()
      };
  
      // Zastępujemy wywołanie archiver() naszym stubem
      sinon.stub(archiver, 'create').returns(archiveStub);
    });
  
    afterEach(() => {
      // Przywrócenie oryginalnych funkcji po każdym teście
      sinon.restore();
    });
  
    it('4. Tworzenie katalogu zip użytkownika', () => {
  
      filehandler.createUserFilesZip('0', resMock);
  
      const expectedPath = path.join('files', '0');
      const expectedFilename = `user_0_files.zip`;
  
      sinon.assert.calledWith(resMock.attachment, expectedFilename);
      sinon.assert.calledWith(archiveStub.pipe, resMock);
      sinon.assert.calledWith(archiveStub.directory, expectedPath, false);
      sinon.assert.calledOnce(archiveStub.finalize);
    });

    afterAll(async () => {
      const folderPath = path.join(__dirname, '../files/0');
      try {
        await fs.promises.rm(folderPath, { recursive: true, force: true });
      } catch (err) {
        console.error('Błąd przy czyszczeniu folderu testowego:', err);
      }
    });
    
  
  });
  
*/
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');
const { createPasswordFile, updatePasswordFile, deletePasswordFile, createUserFilesZip } = require('../utils/fileHandler');

describe('fileHandler', () => {
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(fs, 'mkdir').mockResolvedValue();
    jest.spyOn(fs, 'writeFile').mockResolvedValue();
    jest.spyOn(fs, 'access').mockResolvedValue();
    jest.spyOn(fs, 'unlink').mockResolvedValue();
    jest.spyOn(crypto, 'createHash').mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('1234567890abcdef'.repeat(4)),
    });
    jest.spyOn(archiver, 'create').mockReturnValue({
      pipe: jest.fn(),
      directory: jest.fn().mockReturnThis(),
      finalize: jest.fn(),
    });
    mockRes = {
      attachment: jest.fn(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createPasswordFile', () => {
    it('powinien utworzyć katalog i plik z poprawną nazwą', async () => {
      await createPasswordFile('user1', 'pass1', 'password');
      expect(fs.mkdir).toHaveBeenCalledWith(path.join('files', 'user1'), { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(path.join('files', 'user1', '12345678.txt'), 'password');
    });

    it('powinien zwrócić poprawną nazwę pliku', async () => {
      const result = await createPasswordFile('user1', 'pass1', 'password');
      expect(result).toBe('12345678.txt');
    });

    it('powinien użyć sha256 do hashowania passwordId', async () => {
      await createPasswordFile('user1', 'pass1', 'password');
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(crypto.createHash().update).toHaveBeenCalledWith('pass1');
    });
  });

  describe('updatePasswordFile', () => {
    it('powinien utworzyć katalog i zaktualizować plik', async () => {
      await updatePasswordFile('user1', 'pass1', 'newpassword');
      expect(fs.mkdir).toHaveBeenCalledWith(path.join('files', 'user1'), { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(path.join('files', 'user1', '12345678.txt'), 'newpassword');
    });

    it('powinien zwrócić poprawną nazwę pliku', async () => {
      const result = await updatePasswordFile('user1', 'pass1', 'newpassword');
      expect(result).toBe('12345678.txt');
    });

    it('powinien użyć sha256 do hashowania passwordId', async () => {
      await updatePasswordFile('user1', 'pass1', 'newpassword');
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(crypto.createHash().update).toHaveBeenCalledWith('pass1');
    });
  });

  describe('deletePasswordFile', () => {
    it('powinien usunąć plik jeśli istnieje', async () => {
      await deletePasswordFile('user1', 'pass1');
      expect(fs.access).toHaveBeenCalledWith(path.join('files', 'user1', '12345678.txt'));
      expect(fs.unlink).toHaveBeenCalledWith(path.join('files', 'user1', '12345678.txt'));
    });

    it('powinien nie robić nic jeśli plik nie istnieje', async () => {
      fs.access.mockRejectedValue(new Error('File not found'));
      await deletePasswordFile('user1', 'pass1');
      expect(fs.access).toHaveBeenCalledWith(path.join('files', 'user1', '12345678.txt'));
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('powinien użyć sha256 do hashowania passwordId', async () => {
      await deletePasswordFile('user1', 'pass1');
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(crypto.createHash().update).toHaveBeenCalledWith('pass1');
    });
  });

  describe('createUserFilesZip', () => {
    it('powinien utworzyć archiwum zip z folderu użytkownika', () => {
      createUserFilesZip('user1', mockRes);
      expect(archiver.create).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
      expect(archiver.create().directory).toHaveBeenCalledWith(path.join('files', 'user1'), false);
      expect(archiver.create().finalize).toHaveBeenCalled();
    });

    it('powinien ustawić poprawną nazwę załącznika', () => {
      createUserFilesZip('user1', mockRes);
      expect(mockRes.attachment).toHaveBeenCalledWith('user_user1_files.zip');
    });

    it('powinien przekierować archiwum do odpowiedzi', () => {
      createUserFilesZip('user1', mockRes);
      expect(archiver.create().pipe).toHaveBeenCalledWith(mockRes);
    });
  });
});