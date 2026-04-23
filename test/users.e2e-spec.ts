import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../src/prisma';
import { buildTestApp } from './helpers/app.helper';
import { cleanDatabase } from './helpers/db.helper';

const AUTH = '/api/v1/auth';
const USERS = '/api/v1/users';

const userPayload = {
  name: 'Regular User',
  email: 'user@example.com',
  password: 'User@P4ss!',
};

const adminPayload = {
  name: 'Admin User',
  email: 'admin@example.com',
  password: 'Admin@P4ss!',
};

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userId: string;
  let userToken: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanDatabase(app);

    // Use raw requests (no agent) for setup to avoid cookie leakage
    const server = app.getHttpServer();

    const userReg = await request(server).post(`${AUTH}/register`).send(userPayload);
    userId = userReg.body.data.id;

    const userLogin = await request(server)
      .post(`${AUTH}/login`)
      .send({ email: userPayload.email, password: userPayload.password });
    userToken = userLogin.body.data.access_token;

    const adminReg = await request(server).post(`${AUTH}/register`).send(adminPayload);
    await prisma.user.update({
      where: { id: adminReg.body.data.id },
      data: { role: 'ADMIN' },
    });

    const adminLogin = await request(server)
      .post(`${AUTH}/login`)
      .send({ email: adminPayload.email, password: adminPayload.password });
    adminToken = adminLogin.body.data.access_token;
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  describe(`GET ${USERS}`, () => {
    it('200 — admin can list users', async () => {
      const res = await request(app.getHttpServer())
        .get(USERS)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.items).toBeInstanceOf(Array);
      expect(res.body.data).toHaveProperty('nextCursor');
      expect(res.body.data).toHaveProperty('total');
    });

    it('403 — regular user cannot list users', async () => {
      await request(app.getHttpServer())
        .get(USERS)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('401 — unauthenticated request is rejected', async () => {
      await request(app.getHttpServer()).get(USERS).expect(401);
    });
  });

  describe(`GET ${USERS}/:id`, () => {
    it('200 — user can access their own profile', async () => {
      const res = await request(app.getHttpServer())
        .get(`${USERS}/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(userId);
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('200 — admin can access any profile', async () => {
      await request(app.getHttpServer())
        .get(`${USERS}/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('403 — user cannot access another user profile', async () => {
      const other = await prisma.user.create({
        data: {
          name: 'Other',
          email: 'other@example.com',
          passwordHash: 'hashed',
        },
      });

      await request(app.getHttpServer())
        .get(`${USERS}/${other.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('400 — rejects non-UUID id', async () => {
      await request(app.getHttpServer())
        .get(`${USERS}/not-a-uuid`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe(`PATCH ${USERS}/:id`, () => {
    it('200 — user can update their own name', async () => {
      const res = await request(app.getHttpServer())
        .patch(`${USERS}/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(res.body.data.name).toBe('Updated Name');
    });

    it('403 — user cannot update another user', async () => {
      const other = await prisma.user.create({
        data: {
          name: 'Other',
          email: 'other2@example.com',
          passwordHash: 'hashed',
        },
      });

      await request(app.getHttpServer())
        .patch(`${USERS}/${other.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Hijacked' })
        .expect(403);
    });
  });

  describe(`PATCH ${USERS}/:id/role`, () => {
    it('200 — admin can update user role', async () => {
      const res = await request(app.getHttpServer())
        .patch(`${USERS}/${userId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'ADMIN' })
        .expect(200);

      expect(res.body.data.role).toBe('ADMIN');
    });

    it('403 — regular user cannot change roles', async () => {
      await request(app.getHttpServer())
        .patch(`${USERS}/${userId}/role`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'ADMIN' })
        .expect(403);
    });

    it('400 — rejects invalid role value', async () => {
      await request(app.getHttpServer())
        .patch(`${USERS}/${userId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'SUPERUSER' })
        .expect(400);
    });
  });

  describe(`DELETE ${USERS}/:id`, () => {
    it('204 — admin can soft-delete a user', async () => {
      await request(app.getHttpServer())
        .delete(`${USERS}/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });

    it('403 — regular user cannot delete', async () => {
      await request(app.getHttpServer())
        .delete(`${USERS}/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('404 — returns 404 after user is soft-deleted', async () => {
      await request(app.getHttpServer())
        .delete(`${USERS}/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      await request(app.getHttpServer())
        .delete(`${USERS}/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
