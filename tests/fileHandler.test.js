const filehandler = require('../utils/fileHandler');
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
  
