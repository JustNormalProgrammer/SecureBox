const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const passwordRoutes = require('../routes/passwords');
const {
  getPasswordByUserId,
  createPassword,
  getPasswordByUserPlatformLogin,
  deletePassword,
} = require('../config/db/queries/password');
const {
  createPasswordFile,
  updatePasswordFile,
  deletePasswordFile,
  createUserFilesZip,
} = require('../utils/fileHandler');
const { getHash } = require('../utils/hashGen');
const CustomError = require('../utils/customError');


const app = express();
app.use(express.json());
app.use('/passwords', passwordRoutes);

app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({ detail: err.message || 'Internal server error' });
});


jest.mock('../config/db/queries/password', () => ({
  getPasswordByUserId: jest.fn(),
  createPassword: jest.fn(),
  getPasswordByUserPlatformLogin: jest.fn(),
  deletePassword: jest.fn(),
}));

jest.mock('../utils/fileHandler', () => ({
  createPasswordFile: jest.fn(),
  updatePasswordFile: jest.fn(),
  deletePasswordFile: jest.fn(),
  createUserFilesZip: jest.fn(),
}));

jest.mock('../utils/hashGen', () => ({
  getHash: jest.fn(),
}));

jest.mock('../middleware/auth', () => {
    const jwt = jest.requireActual('jsonwebtoken'); 
    return {
      authenticateToken: (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ detail: 'Unauthorized' });
        try {
          const decoded = jwt.verify(token, 'test_secret_key');
          req.user = decoded;
          next();
        } catch (err) {
          return res.status(401).json({ detail: 'Unauthorized' });
        }
      },
    };
  });
  


const generujToken = (user) => {
  return jwt.sign(user, 'test_secret_key', { expiresIn: '1h' });
};


const mockUzytkownik = {
  id: '123',
  login: 'jan@przyklad.pl',
};

describe('Testy Endpointów HASEŁ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });


  describe('GET /passwords/', () => {
    it('powinien zwrócić listę haseł z poprawnym tokenem', async () => {
      const token = generujToken(mockUzytkownik);
      getPasswordByUserId.mockResolvedValue([
        { id: '1', platform: 'example', login: 'user1', logo: 'logo.png' },
      ]);
      getHash.mockResolvedValue('hashed_id_1');

      const res = await request(app)
        .get('/passwords/')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([
        { id: '1', platform: 'example', login: 'user1', logo: 'logo.png', passwordfile: 'hashed_id_1' },
      ]);
    });

    it('powinien zwrócić pustą listę, jeśli użytkownik nie ma haseł', async () => {
      const token = generujToken(mockUzytkownik);
      getPasswordByUserId.mockResolvedValue([]);

      const res = await request(app)
        .get('/passwords/')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('powinien zwrócić 401, jeśli token jest nieprawidłowy', async () => {
      const res = await request(app)
        .get('/passwords/')
        .set('Authorization', 'Bearer invalid_token');

      expect(res.statusCode).toBe(401);
      expect(res.body.detail).toBe('Unauthorized');
    });

    
  });


  describe('GET /passwords/:user_id/files', () => {
    it('powinien zwrócić archiwum ZIP dla poprawnego użytkownika', async () => {
      const token = generujToken(mockUzytkownik);
      createUserFilesZip.mockImplementation((userId, res) => {
        res.set('Content-Type', 'application/zip');
        res.send('mocked_zip_content');
      });

      const res = await request(app)
        .get('/passwords/123/files')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/zip');
      expect(createUserFilesZip).toHaveBeenCalledWith('123', expect.anything());
    });

    it('powinien zwrócić 403, jeśli user_id nie należy do użytkownika', async () => {
      const token = generujToken({ ...mockUzytkownik, id: '456' });

      const res = await request(app)
        .get('/passwords/123/files')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.detail).toBe('Forbidden');
    });

    it('powinien zwrócić 401, jeśli token jest nieprawidłowy', async () => {
      const res = await request(app)
        .get('/passwords/123/files')
        .set('Authorization', 'Bearer invalid_token');

      expect(res.statusCode).toBe(401);
      expect(res.body.detail).toBe('Unauthorized');
    });

   
  });


  describe('POST /passwords/:user_id/files', () => {
    it('powinien utworzyć nowe hasło z poprawnymi danymi', async () => {
      const token = generujToken(mockUzytkownik);
      getPasswordByUserPlatformLogin.mockResolvedValue([]);
      createPassword.mockResolvedValue('1');
      createPasswordFile.mockResolvedValue('password_file.txt');

      const res = await request(app)
        .post('/passwords/123/files')
        .set('Authorization', `Bearer ${token}`)
        .send({
          platform: 'example',
          login: 'user1',
          password: 'secret',
          logo: 'logo.png',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toEqual({
        id: '1',
        filename: 'password_file.txt',
        logo: 'logo.png',
        platform: 'example',
        login: 'user1',
        userId: '123',
      });
    });

    it('powinien zwrócić 400, jeśli user_id jest nieprawidłowy', async () => {
      const token = generujToken(mockUzytkownik);

      const res = await request(app)
        .post('/passwords/invalid@id/files')
        .set('Authorization', `Bearer ${token}`)
        .send({
          platform: 'example',
          login: 'user1',
          password: 'secret',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toBe('Invalid user ID');
    });

    it('powinien zwrócić 403, jeśli user_id nie należy do użytkownika', async () => {
      const token = generujToken({ ...mockUzytkownik, id: '456' });

      const res = await request(app)
        .post('/passwords/123/files')
        .set('Authorization', `Bearer ${token}`)
        .send({
          platform: 'example',
          login: 'user1',
          password: 'secret',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.detail).toBe('Forbidden');
    });

    it('powinien zwrócić 400, jeśli platforma jest pusta', async () => {
      const token = generujToken(mockUzytkownik);

      const res = await request(app)
        .post('/passwords/123/files')
        .set('Authorization', `Bearer ${token}`)
        .send({
          platform: '',
          login: 'user1',
          password: 'secret',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toContain('Platform field cannot be empty');
    });

    it('powinien zwrócić 400, jeśli login jest pusty', async () => {
      const token = generujToken(mockUzytkownik);

      const res = await request(app)
        .post('/passwords/123/files')
        .set('Authorization', `Bearer ${token}`)
        .send({
          platform: 'example',
          login: '',
          password: 'secret',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toContain('Login field cannot be empty');
    });

    it('powinien zwrócić 400, jeśli hasło jest puste', async () => {
      const token = generujToken(mockUzytkownik);

      const res = await request(app)
        .post('/passwords/123/files')
        .set('Authorization', `Bearer ${token}`)
        .send({
          platform: 'example',
          login: 'user1',
          password: '',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toContain('Password field cannot be empty');
    });

    it('powinien zwrócić 400, jeśli hasło już istnieje', async () => {
      const token = generujToken(mockUzytkownik);
      getPasswordByUserPlatformLogin.mockResolvedValue([
        { id: '1', platform: 'example', login: 'user1' },
      ]);

      const res = await request(app)
        .post('/passwords/123/files')
        .set('Authorization', `Bearer ${token}`)
        .send({
          platform: 'example',
          login: 'user1',
          password: 'secret',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toBe('Login credentials already exist');
    });

    it('powinien zwrócić 401, jeśli token jest nieprawidłowy', async () => {
      const res = await request(app)
        .post('/passwords/123/files')
        .set('Authorization', 'Bearer invalid_token')
        .send({
          platform: 'example',
          login: 'user1',
          password: 'secret',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.detail).toBe('Unauthorized');
    });

    
  });

 
  describe('PUT /passwords/:user_id/passwords/:platform/:login', () => {
    it('powinien zaktualizować hasło z poprawnymi danymi', async () => {
      const token = generujToken(mockUzytkownik);
      getPasswordByUserPlatformLogin.mockResolvedValue([
        { id: '1', platform: 'example', login: 'user1', logo: 'logo.png' },
      ]);
      updatePasswordFile.mockResolvedValue('new_password_file.txt');

      const res = await request(app)
        .put('/passwords/123/passwords/example/user1')
        .set('Authorization', `Bearer ${token}`)
        .send({ new_password: 'new_secret' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        id: '1',
        passwordfile: 'new_password_file.txt',
        logo: 'logo.png',
        platform: 'example',
        login: 'user1',
        userId: '123',
      });
    });

    it('powinien zwrócić 400, jeśli user_id jest nieprawidłowy', async () => {
      const token = generujToken(mockUzytkownik);

      const res = await request(app)
        .put('/passwords/invalid@id/passwords/example/user1')
        .set('Authorization', `Bearer ${token}`)
        .send({ new_password: 'new_secret' });

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toBe('Invalid user ID');
    });

    it('powinien zwrócić 403, jeśli user_id nie należy do użytkownika', async () => {
      const token = generujToken({ ...mockUzytkownik, id: '456' });

      const res = await request(app)
        .put('/passwords/123/passwords/example/user1')
        .set('Authorization', `Bearer ${token}`)
        .send({ new_password: 'new_secret' });

      expect(res.statusCode).toBe(403);
      expect(res.body.detail).toBe('Forbidden');
    });

    it('powinien zwrócić 400, jeśli new_password jest puste', async () => {
      const token = generujToken(mockUzytkownik);

      const res = await request(app)
        .put('/passwords/123/passwords/example/user1')
        .set('Authorization', `Bearer ${token}`)
        .send({ new_password: '' });

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toContain('New password field cannot be empty');
    });

    it('powinien zwrócić 404, jeśli hasło nie istnieje', async () => {
      const token = generujToken(mockUzytkownik);
      getPasswordByUserPlatformLogin.mockResolvedValue([]);

      const res = await request(app)
        .put('/passwords/123/passwords/example/user1')
        .set('Authorization', `Bearer ${token}`)
        .send({ new_password: 'new_secret' });

      expect(res.statusCode).toBe(404);
      expect(res.body.detail).toBe('Password not found');
    });

    it('powinien zwrócić 401, jeśli token jest nieprawidłowy', async () => {
      const res = await request(app)
        .put('/passwords/123/passwords/example/user1')
        .set('Authorization', 'Bearer invalid_token')
        .send({ new_password: 'new_secret' });

      expect(res.statusCode).toBe(401);
      expect(res.body.detail).toBe('Unauthorized');
    });

    
  });

  
  describe('DELETE /passwords/:user_id/passwords/:platform/:login', () => {
    it('powinien usunąć hasło z poprawnymi danymi', async () => {
      const token = generujToken(mockUzytkownik);
      getPasswordByUserPlatformLogin.mockResolvedValue([
        { id: '1', platform: 'example', login: 'user1' },
      ]);
      deletePasswordFile.mockResolvedValue();
      deletePassword.mockResolvedValue();

      const res = await request(app)
        .delete('/passwords/123/passwords/example/user1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Password for example/user1 deleted');
    });

    it('powinien zwrócić 400, jeśli user_id jest nieprawidłowy', async () => {
      const token = generujToken(mockUzytkownik);

      const res = await request(app)
        .delete('/passwords/invalid@id/passwords/example/user1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toBe('Invalid user ID');
    });

    it('powinien zwrócić 403, jeśli user_id nie należy do użytkownika', async () => {
      const token = generujToken({ ...mockUzytkownik, id: '456' });

      const res = await request(app)
        .delete('/passwords/123/passwords/example/user1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.detail).toBe('Forbidden');
    });

    it('powinien zwrócić 404, jeśli hasło nie istnieje', async () => {
      const token = generujToken(mockUzytkownik);
      getPasswordByUserPlatformLogin.mockResolvedValue([]);

      const res = await request(app)
        .delete('/passwords/123/passwords/example/user1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.detail).toBe('Password not found');
    });

    it('powinien zwrócić 401, jeśli token jest nieprawidłowy', async () => {
      const res = await request(app)
        .delete('/passwords/123/passwords/example/user1')
        .set('Authorization', 'Bearer invalid_token');

      expect(res.statusCode).toBe(401);
      expect(res.body.detail).toBe('Unauthorized');
    });

   
  });


  describe('PUT /passwords/:user_id/passwords', () => {
    it('powinien zaktualizować wszystkie hasła z poprawnymi danymi', async () => {
      const token = generujToken(mockUzytkownik);
      getPasswordByUserId.mockResolvedValue([
        { id: '1', platform: 'example', login: 'user1', logo: 'logo.png' },
      ]);
      updatePasswordFile.mockResolvedValue('new_password_file.txt');

      const res = await request(app)
        .put('/passwords/123/passwords')
        .set('Authorization', `Bearer ${token}`)
        .send({
          passwordsall: [
            { platform: 'example', login: 'user1', new_password: 'new_secret' },
          ],
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([
        {
          id: '1',
          logo: 'logo.png',
          platform: 'example',
          login: 'user1',
          userId: '123',
        },
      ]);
    });

    it('powinien zwrócić 400, jeśli user_id jest nieprawidłowy', async () => {
      const token = generujToken(mockUzytkownik);

      const res = await request(app)
        .put('/passwords/invalid@id/passwords')
        .set('Authorization', `Bearer ${token}`)
        .send({
          passwordsall: [
            { platform: 'example', login: 'user1', new_password: 'new_secret' },
          ],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toBe('Invalid user ID');
    });

    it('powinien zwrócić 403, jeśli user_id nie należy do użytkownika', async () => {
      const token = generujToken({ ...mockUzytkownik, id: '456' });

      const res = await request(app)
        .put('/passwords/123/passwords')
        .set('Authorization', `Bearer ${token}`)
        .send({
          passwordsall: [
            { platform: 'example', login: 'user1', new_password: 'new_secret' },
          ],
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.detail).toBe('Forbidden');
    });

    it('powinien zwrócić 404, jeśli użytkownik nie ma haseł', async () => {
      const token = generujToken(mockUzytkownik);
      getPasswordByUserId.mockResolvedValue([]);

      const res = await request(app)
        .put('/passwords/123/passwords')
        .set('Authorization', `Bearer ${token}`)
        .send({
          passwordsall: [
            { platform: 'example', login: 'user1', new_password: 'new_secret' },
          ],
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.detail).toBe('No passwords found');
    });

    it('powinien zwrócić 400, jeśli passwordsall nie jest tablicą', async () => {
      const token = generujToken(mockUzytkownik);
      getPasswordByUserId.mockResolvedValue([
        { id: '1', platform: 'example', login: 'user1', logo: 'logo.png' },
      ]);

      const res = await request(app)
        .put('/passwords/123/passwords')
        .set('Authorization', `Bearer ${token}`)
        .send({ passwordsall: {} });

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toBe('passwordsall must be an array');
    });

    it('powinien zwrócić 400, jeśli passwordsall zawiera nieprawidłowy format danych', async () => {
      const token = generujToken(mockUzytkownik);
      getPasswordByUserId.mockResolvedValue([
        { id: '1', platform: 'example', login: 'user1', logo: 'logo.png' },
      ]);

      const res = await request(app)
        .put('/passwords/123/passwords')
        .set('Authorization', `Bearer ${token}`)
        .send({
          passwordsall: [
            { platform: 123, login: 'user1', new_password: 'new_secret' },
          ],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toBe('Invalid password data format');
    });

    it('powinien zwrócić 400, jeśli nie wszystkie hasła są uwzględnione', async () => {
      const token = generujToken(mockUzytkownik);
      getPasswordByUserId.mockResolvedValue([
        { id: '1', platform: 'example', login: 'user1', logo: 'logo.png' },
        { id: '2', platform: 'example2', login: 'user2', logo: 'logo2.png' },
      ]);

      const res = await request(app)
        .put('/passwords/123/passwords')
        .set('Authorization', `Bearer ${token}`)
        .send({
          passwordsall: [
            { platform: 'example', login: 'user1', new_password: 'new_secret' },
          ],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toBe('All accounts must be updated');
    });

    it('powinien zwrócić 401, jeśli token jest nieprawidłowy', async () => {
      const res = await request(app)
        .put('/passwords/123/passwords')
        .set('Authorization', 'Bearer invalid_token')
        .send({
          passwordsall: [
            { platform: 'example', login: 'user1', new_password: 'new_secret' },
          ],
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.detail).toBe('Unauthorized');
    });

    
  });
});