import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { buildTestApp } from './helpers/app.helper';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/ — rejects unauthenticated request (global JWT guard)', async () => {
    await request(app.getHttpServer()).get('/api/v1/').expect(401);
  });
});
