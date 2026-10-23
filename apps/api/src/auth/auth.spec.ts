import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { createTestApp, PASSWORD, uniqueEmail } from '../test-utils';

describe('Auth API', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('[AC-1] register with a valid unused email returns 201 and no password or hash', async () => {
    const email = uniqueEmail();
    const res = await request(app.getHttpServer()).post('/auth/register').send({ email, password: PASSWORD }).expect(201);
    expect(res.body.email).toBe(email);
    expect(res.body.id).toBeDefined();
    const text = JSON.stringify(res.body);
    expect(text).not.toContain(PASSWORD);
    expect(text.toLowerCase()).not.toContain('hash');
    expect(text).not.toContain('password');
    expect(await prisma.user.findUnique({ where: { email } })).not.toBeNull();
  });

  it('[AC-2] register with a duplicate email returns 409 and creates no second account', async () => {
    const email = uniqueEmail();
    await request(app.getHttpServer()).post('/auth/register').send({ email, password: PASSWORD }).expect(201);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: email.toUpperCase(), password: PASSWORD })
      .expect(409);
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });

  it('[AC-2] register with malformed email or missing/short password returns 400 and creates nothing', async () => {
    const before = await prisma.user.count();
    const http = app.getHttpServer();
    await request(http).post('/auth/register').send({ email: 'not-an-email', password: PASSWORD }).expect(400);
    await request(http).post('/auth/register').send({ email: uniqueEmail() }).expect(400);
    await request(http).post('/auth/register').send({ email: uniqueEmail(), password: 'short' }).expect(400);
    expect(await prisma.user.count()).toBe(before);
  });

  it('[AC-3] login with correct credentials returns 200 and sets an httpOnly session cookie', async () => {
    const email = uniqueEmail();
    await request(app.getHttpServer()).post('/auth/register').send({ email, password: PASSWORD }).expect(201);
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email, password: PASSWORD }).expect(200);
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] as unknown as string[]);
    expect(cookies.some((c) => c.startsWith('session=') && /HttpOnly/i.test(c) && /SameSite=Lax/i.test(c))).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('[AC-3] wrong password and unknown email return the same 401', async () => {
    const email = uniqueEmail();
    await request(app.getHttpServer()).post('/auth/register').send({ email, password: PASSWORD }).expect(201);
    const wrong = await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'wrong-password-1' }).expect(401);
    const unknown = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: uniqueEmail('nobody'), password: 'wrong-password-1' })
      .expect(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  it('[AC-4] the password is stored only as a salted hash', async () => {
    const email = uniqueEmail();
    await request(app.getHttpServer()).post('/auth/register').send({ email, password: PASSWORD }).expect(201);
    const other = uniqueEmail();
    await request(app.getHttpServer()).post('/auth/register').send({ email: other, password: PASSWORD }).expect(201);
    const a = await prisma.user.findUniqueOrThrow({ where: { email } });
    const b = await prisma.user.findUniqueOrThrow({ where: { email: other } });
    expect(a.passwordHash).not.toBe(PASSWORD);
    expect(a.passwordHash).not.toContain(PASSWORD);
    expect(a.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(a.passwordHash).not.toBe(b.passwordHash); // salted
  });

  it('[AC-5] protected endpoints return 401 without a session and work with one', async () => {
    const http = app.getHttpServer();
    await request(http).get('/auth/me').expect(401);
    await request(http).get('/auth/me').set('Cookie', 'session=garbage').expect(401);
    const agent = request.agent(http);
    const email = uniqueEmail();
    await agent.post('/auth/register').send({ email, password: PASSWORD }).expect(201);
    const me = await agent.get('/auth/me').expect(200);
    expect(me.body.email).toBe(email);
    await agent.post('/auth/logout').expect(204);
    await agent.get('/auth/me').expect(401);
  });

  it('serves the OpenAPI document at /openapi.json', async () => {
    const res = await request(app.getHttpServer()).get('/openapi.json').expect(200);
    expect(res.body.paths['/auth/register']).toBeDefined();
  });
});