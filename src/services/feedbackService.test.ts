import { describe, expect, it } from 'vitest';
import { withoutUndefined } from './feedbackService';

describe('feedback payload', () => {
  it('drops undefined fields, which Firestore refuses to store', () => {
    const anonymous = { id: 'fb_1', userId: 'anonymous', userEmail: undefined, sampleContext: undefined, rating: 5 };
    const clean = withoutUndefined(anonymous);
    expect(Object.values(clean)).not.toContain(undefined);
    expect(clean).toEqual({ id: 'fb_1', userId: 'anonymous', rating: 5 });
  });
});
