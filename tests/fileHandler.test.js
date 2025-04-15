const filehandler = require('../utils/fileHandler');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const { expect } = require('chai');
const sinon = require('sinon');

let newDesiredFile;
let desiredFile;

describe('Testowanie funkcji fileHandler', function() {
  
    before( function () {
        const testDir = path.join(__dirname, '../files/1');
        if (fs.existsSync(testDir)) {
          fs.rmSync(testDir, { recursive: true, force: true });
        }
        fs.mkdirSync(testDir, { recursive: true });
      });

    it('1. Tworzenie pliku z hasłem', async function() {
      await filehandler.createPasswordFile('1', 'haslo');
      const desiredFile = path.join(__dirname, '../files/1/abe31fe1.txt');
      expect(fs.existsSync(desiredFile)).to.be.true;
    });
  
    it('2. Aktualizacja pliku z hasłem', async function() {
      newDesiredFile = path.join(__dirname, '../files/1/49673d1f.txt');
      await filehandler.updatePasswordFile('1', 'abe31fe1.txt', 'nowehaslo');
      filehandler.updatePasswordFile('1', 'abe31fe1.txt', 'nowehaslo');
      expect(fs.existsSync(newDesiredFile)).to.be.true;
      expect(fs.existsSync(desiredFile)).to.be.false;
    });
  
    it('3. Usuwanie pliku z hasłem', async function() {
      await filehandler.deletePasswordFile('1', '49673d1f.txt');
      expect(fs.existsSync(newDesiredFile)).to.be.false;
    });
  
    it('4. Tworzenie pliku zip użytkownika', async function() {
        const desiredZipPath = path.join(__dirname, '../files/1/user_1_files.zip');
      
        // Tworzymy "fałszywy" obiekt odpowiedzi (res)
        const res = new stream.PassThrough();
        res.attachment = sinon.spy();
        res.status = sinon.stub().returns(res);
        res.send = sinon.spy();
      
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk)); 
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);


          
          expect(buffer.length).to.be.greaterThan(0);
      
          expect(res.attachment.calledWith('user_1_files.zip')).to.be.true;
      
          expect(fs.existsSync(desiredZipPath)).to.be.true;
      
        });
      
      });
      

    after(function () {
      const testDir = path.join(__dirname, '../files/1');
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
        console.log('🧼 Usunięto katalog testowy:', testDir);
      }
    });
  
  });
  
