import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { createTestApp, PASSWORD, uniqueEmail } from '../test-utils';

describe('Expenses API', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  async function newAgent() {
    const agent = request.agent(app.getHttpServer());
    const email = uniqueEmail('exp');
    await agent.post('/auth/register').send({ email, password: PASSWORD }).expect(201);
    return agent;
  }

  const valid = { title: 'Lunch', amount: '12.50', date: '2026-10-23', category: 'food' };

  it('[AC-5] expenses and categories endpoints return 401 without a session', async () => {
    const http = app.getHttpServer();
    await request(http).get('/expenses').expect(401);
    await request(http).post('/expenses').send(valid).expect(401);
    await request(http).get('/expenses/abc').expect(401);
    await request(http).patch('/expenses/abc').send({ title: 'x' }).expect(401);
    await request(http).delete('/expenses/abc').expect(401);
    await request(http).get('/categories').expect(401);
  });

  it('[AC-8] POST /expenses creates an expense owned by the caller', async () => {
    const agent = await newAgent();
    const res = await agent.post('/expenses').send(valid).expect(201);
    expect(res.body).toMatchObject({ title: 'Lunch', amount: '12.50', date: '2026-10-23', category: 'food' });
    const row = await prisma.expense.findUniqueOrThrow({ where: { id: res.body.id } });
    const me = await agent.get('/auth/me').expect(200);
    expect(row.userId).toBe(me.body.id);
    const cats = await agent.get('/categories').expect(200);
    expect(cats.body.map((c: { name: string }) => c.name).sort()).toEqual(
      ['bills', 'education', 'food', 'shopping', 'transport'],
    );
  });

  it('[AC-9] invalid input returns 400 and saves nothing', async () => {
    const agent = await newAgent();
    const bad = [
      { ...valid, title: '' },
      { ...valid, title: undefined },
      { ...valid, amount: '0' },
      { ...valid, amount: '-5' },
      { ...valid, amount: 'abc' },
      { ...valid, amount: '1.234' },
      { ...valid, date: '2026-13-45' },
      { ...valid, date: 'yesterday' },
      { ...valid, category: undefined },
      { ...valid, category: 'gambling' },
    ];
    for (const body of bad) {
      await agent.post('/expenses').send(body).expect(400);
    }
    const list = await agent.get('/expenses').expect(200);
    expect(list.body.total).toBe(0);
    const created = await agent.post('/expenses').send(valid).expect(201);
    await agent.patch(`/expenses/${created.body.id}`).send({ amount: '-1' }).expect(400);
    await agent.patch(`/expenses/${created.body.id}`).send({ category: 'nope' }).expect(400);
    const after = await agent.get(`/expenses/${created.body.id}`).expect(200);
    expect(after.body.amount).toBe('12.50');
    expect(after.body.category).toBe('food');
  });

  it('[AC-10] get, patch and delete an expense', async () => {
    const agent = await newAgent();
    const created = await agent.post('/expenses').send(valid).expect(201);
    const id = created.body.id;
    const got = await agent.get(`/expenses/${id}`).expect(200);
    expect(got.body.id).toBe(id);
    const patched = await agent
      .patch(`/expenses/${id}`)
      .send({ title: 'Dinner', amount: '20', category: 'bills', date: '2026-10-24' })
      .expect(200);
    expect(patched.body).toMatchObject({ title: 'Dinner', amount: '20.00', category: 'bills', date: '2026-10-24' });
    await agent.delete(`/expenses/${id}`).expect(204);
    await agent.get(`/expenses/${id}`).expect(404);
  });

  it("[AC-6] a user only sees their own expenses and cannot touch another user's", async () => {
    const a = await newAgent();
    const b = await newAgent();
    const bExp = await b.post('/expenses').send({ ...valid, title: 'B secret' }).expect(201);
    await a.post('/expenses').send({ ...valid, title: 'A thing' }).expect(201);
    const list = await a.get('/expenses').expect(200);
    expect(list.body.items.map((i: { title: string }) => i.title)).toEqual(['A thing']);
    await a.get(`/expenses/${bExp.body.id}`).expect(404);
    await a.patch(`/expenses/${bExp.body.id}`).send({ title: 'hacked' }).expect(404);
    await a.delete(`/expenses/${bExp.body.id}`).expect(404);
    const still = await b.get(`/expenses/${bExp.body.id}`).expect(200);
    expect(still.body.title).toBe('B secret');
  });

  it('[AC-15] search matches titles case-insensitively for the caller only', async () => {
    const agent = await newAgent();
    await agent.post('/expenses').send({ ...valid, title: 'Coffee Beans' }).expect(201);
    await agent.post('/expenses').send({ ...valid, title: 'Bus pass', category: 'transport' }).expect(201);
    const res = await agent.get('/expenses').query({ search: 'coFFee' }).expect(200);
    expect(res.body.items.map((i: { title: string }) => i.title)).toEqual(['Coffee Beans']);
    expect(res.body.total).toBe(1);
  });

  it('[AC-16] category, date range and combined filters use AND semantics, inclusive', async () => {
    const agent = await newAgent();
    await agent.post('/expenses').send({ title: 'Pizza', amount: '10', date: '2026-09-30', category: 'food' }).expect(201);
    await agent.post('/expenses').send({ title: 'Pasta', amount: '11', date: '2026-10-01', category: 'food' }).expect(201);
    await agent.post('/expenses').send({ title: 'Pass', amount: '12', date: '2026-10-15', category: 'transport' }).expect(201);
    await agent.post('/expenses').send({ title: 'Pita', amount: '13', date: '2026-10-31', category: 'food' }).expect(201);
    const titles = (r: { body: { items: { title: string }[] } }) => r.body.items.map((i) => i.title);
    expect(titles(await agent.get('/expenses').query({ category: 'food' }).expect(200))).toEqual(['Pita', 'Pasta', 'Pizza']);
    expect(titles(await agent.get('/expenses').query({ from: '2026-10-01', to: '2026-10-31' }).expect(200))).toEqual([
      'Pita',
      'Pass',
      'Pasta',
    ]);
    expect(
      titles(await agent.get('/expenses').query({ search: 'pa', category: 'food', from: '2026-10-01', to: '2026-10-31' }).expect(200)),
    ).toEqual(['Pasta']);
    await agent.get('/expenses').query({ category: 'bogus' }).expect(400);
    await agent.get('/expenses').query({ from: 'nope' }).expect(400);
    const paged = await agent.get('/expenses').query({ page: 2, limit: 2 }).expect(200);
    expect(paged.body).toMatchObject({ page: 2, limit: 2, total: 4 });
    expect(paged.body.items).toHaveLength(2);
    await agent.get('/expenses').query({ limit: 1000 }).expect(400);
  });
});