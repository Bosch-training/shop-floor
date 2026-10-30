const { hashPassword, verifyPassword } = require('./passwordService');

const PLAIN = 'Correct-Horse-42';

describe('passwordService (LLD-FR-02, NFR-04)', () => {
  it('WIPC-10-TC-148 hashes with bcrypt cost 12 by default', async () => {
    const hash = await hashPassword(PLAIN);

    expect(hash).toHaveLength(60);
    expect(hash).toMatch(/^\$2[ab]\$12\$/);
    expect(hash).not.toBe(PLAIN);
  });

  it('WIPC-10-TC-150 honors an explicit rounds argument', async () => {
    const hash = await hashPassword(PLAIN, 4);

    expect(hash).toMatch(/^\$2[ab]\$04\$/);
  });

  it('WIPC-10-TC-149 verifies the correct password', async () => {
    const hash = await hashPassword(PLAIN, 4);

    await expect(verifyPassword(PLAIN, hash)).resolves.toBe(true);
  });

  it('WIPC-10-TC-151 salts every hash differently', async () => {
    const first = await hashPassword(PLAIN, 4);
    const second = await hashPassword(PLAIN, 4);

    expect(first).not.toBe(second);
    await expect(verifyPassword(PLAIN, first)).resolves.toBe(true);
    await expect(verifyPassword(PLAIN, second)).resolves.toBe(true);
  });

  it.each([
    ['WIPC-10-TC-152 wrong password', 'Wrong-Horse-42'],
    ['WIPC-10-TC-152 different case', 'correct-horse-42'],
  ])('%s verifies to false', async (name, attempt) => {
    const hash = await hashPassword(PLAIN, 4);

    await expect(verifyPassword(attempt, hash)).resolves.toBe(false);
  });

  it('WIPC-10-TC-153 returns false for a malformed hash', async () => {
    await expect(verifyPassword(PLAIN, 'not-a-hash')).resolves.toBe(false);
  });

  it('WIPC-10-TC-154 verifies non-ASCII passwords', async () => {
    const plain = 'Pässwörd-密码-42';
    const hash = await hashPassword(plain, 4);

    await expect(verifyPassword(plain, hash)).resolves.toBe(true);
  });

  it('WIPC-10-TC-155 keeps the plain text out of the hash', async () => {
    const hash = await hashPassword(PLAIN, 4);
    const slices = [];
    for (let i = 0; i + 6 <= PLAIN.length; i += 1) {
      slices.push(PLAIN.slice(i, i + 6));
    }

    expect(hash).not.toContain(PLAIN);
    slices.forEach((slice) => expect(hash).not.toContain(slice));
  });
});
