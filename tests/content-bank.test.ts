import { describe, it, expect } from 'vitest';
import { VITAMIN_FACTS, HEALTH_TIPS, RECIPE_TEASERS, CONTENT_STATS } from '../src/config/content-bank.js';

describe('Content Bank: Facts count', () => {
  it('should have 100+ vitamin facts', () => {
    expect(VITAMIN_FACTS.length).toBeGreaterThanOrEqual(100);
  });

  it('should have 15+ health tips', () => {
    expect(HEALTH_TIPS.length).toBeGreaterThanOrEqual(15);
  });

  it('should have 15+ recipe teasers', () => {
    expect(RECIPE_TEASERS.length).toBeGreaterThanOrEqual(15);
  });

  it('total content should be 130+', () => {
    expect(CONTENT_STATS.total).toBeGreaterThanOrEqual(130);
  });
});

describe('Content Bank: Uniqueness', () => {
  it('all vitamin fact IDs should be unique', () => {
    const ids = VITAMIN_FACTS.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all vitamin fact texts should be unique', () => {
    const texts = VITAMIN_FACTS.map(f => f.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('all health tip IDs should be unique', () => {
    const ids = HEALTH_TIPS.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all recipe teaser IDs should be unique', () => {
    const ids = RECIPE_TEASERS.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Content Bank: Length limits', () => {
  it('all facts should be under 280 characters', () => {
    for (const fact of VITAMIN_FACTS) {
      expect(fact.text.length, `Fact ${fact.id} is ${fact.text.length} chars`).toBeLessThanOrEqual(280);
    }
  });

  it('all health tips should be under 280 characters', () => {
    for (const tip of HEALTH_TIPS) {
      expect(tip.text.length, `Tip ${tip.id} is ${tip.text.length} chars`).toBeLessThanOrEqual(280);
    }
  });
});

describe('Content Bank: Emoji requirement', () => {
  // Extended emoji regex covering all Unicode emoji blocks including newer ones (🫒, 🫘, etc.)
  const emojiRegex = /[\u{1F300}-\u{1FAD6}\u{1FAE0}-\u{1FAF8}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{231A}\u{231B}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{25AA}\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}]/u;

  it('all vitamin facts should contain at least 1 emoji', () => {
    for (const fact of VITAMIN_FACTS) {
      expect(emojiRegex.test(fact.text), `Fact ${fact.id} has no emoji`).toBe(true);
    }
  });

  it('all health tips should contain at least 1 emoji', () => {
    for (const tip of HEALTH_TIPS) {
      expect(emojiRegex.test(tip.text), `Tip ${tip.id} has no emoji`).toBe(true);
    }
  });

  it('all recipe teasers should contain at least 1 emoji', () => {
    for (const teaser of RECIPE_TEASERS) {
      expect(emojiRegex.test(teaser.text), `Teaser ${teaser.id} has no emoji`).toBe(true);
    }
  });
});

describe('Content Bank: No medical claims', () => {
  const forbiddenWords = ['лечит', 'вылечивает', 'излечивает', 'исцеляет', 'панацея'];

  it('no vitamin facts should contain medical claims', () => {
    for (const fact of VITAMIN_FACTS) {
      const lower = fact.text.toLowerCase();
      for (const word of forbiddenWords) {
        expect(lower.includes(word), `Fact ${fact.id} contains "${word}"`).toBe(false);
      }
    }
  });

  it('no health tips should contain medical claims', () => {
    for (const tip of HEALTH_TIPS) {
      const lower = tip.text.toLowerCase();
      for (const word of forbiddenWords) {
        expect(lower.includes(word), `Tip ${tip.id} contains "${word}"`).toBe(false);
      }
    }
  });
});

describe('Content Bank: Tag coverage', () => {
  it('should have facts for major vitamins', () => {
    const requiredTags = ['vitamin_a', 'vitamin_c', 'vitamin_d', 'vitamin_e', 'vitamin_b12', 'iron', 'calcium', 'magnesium'];
    for (const tag of requiredTags) {
      const count = VITAMIN_FACTS.filter(f => f.tags.includes(tag)).length;
      expect(count, `Tag "${tag}" should have 3+ facts`).toBeGreaterThanOrEqual(3);
    }
  });

  it('should have seasonal content', () => {
    const winterFacts = VITAMIN_FACTS.filter(f => f.season === 'winter');
    const summerFacts = VITAMIN_FACTS.filter(f => f.season === 'summer');
    expect(winterFacts.length).toBeGreaterThan(0);
    expect(summerFacts.length).toBeGreaterThan(0);
  });
});

describe('Content Bank: Seasonal tags', () => {
  it('all season values should be valid', () => {
    const validSeasons = ['winter', 'spring', 'summer', 'autumn', 'all', undefined];
    for (const fact of VITAMIN_FACTS) {
      expect(validSeasons.includes(fact.season), `Fact ${fact.id} has invalid season: ${fact.season}`).toBe(true);
    }
  });
});
