const { throwAppError } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const { ACCESS_TYPES, BUSINESS_ERROR_CODES, CARD_STATUSES } = require('./constants');

function throwBusinessError(message, code, httpStatus) {
  throwAppError(message, code, {
    context: {
      code,
      httpStatus,
    },
  });
}

function isAlphaNumeric(value) {
  const charCode = value.charCodeAt(0);
  const isNumber = charCode >= 48 && charCode <= 57;
  const isUppercase = charCode >= 65 && charCode <= 90;
  const isLowercase = charCode >= 97 && charCode <= 122;

  return isNumber || isUppercase || isLowercase;
}

function isValidSlug(value) {
  if (!value || typeof value !== 'string') return false;

  return value.split('').every((char) => isAlphaNumeric(char) || char === '-' || char === '_');
}

function isValidAccessCode(value) {
  if (!value || value.length !== 6) return false;

  return value.split('').every(isAlphaNumeric);
}

function ensureAccessCodeRules(data) {
  const accessType = data.access_type || ACCESS_TYPES.PUBLIC;

  if (accessType === ACCESS_TYPES.PRIVATE && !data.access_code) {
    throwBusinessError(
      CreatorCardMessages.ACCESS_CODE_REQUIRED,
      BUSINESS_ERROR_CODES.ACCESS_CODE_REQUIRED,
      400
    );
  }

  if (accessType === ACCESS_TYPES.PUBLIC && data.access_code) {
    throwBusinessError(
      CreatorCardMessages.ACCESS_CODE_PUBLIC_FORBIDDEN,
      BUSINESS_ERROR_CODES.ACCESS_CODE_PUBLIC_FORBIDDEN,
      400
    );
  }

  if (data.access_code && !isValidAccessCode(data.access_code)) {
    throwBusinessError(
      'access_code must be exactly 6 alphanumeric characters',
      'SPCL_VALIDATION',
      400
    );
  }
}

function serializeCreatorCard(card, options = {}) {
  if (!card) return null;

  // MongoDB keeps _id internally; the API only exposes id.
  const serialized = {
    id: card._id || card.id,
    title: card.title,
    description: card.description || '',
    slug: card.slug,
    links: card.links || [],
    service_rates: card.service_rates?.currency
      ? {
          currency: card.service_rates.currency,
          rates: card.service_rates.rates || [],
        }
      : undefined,
    status: card.status,
    access_type: card.access_type || ACCESS_TYPES.PUBLIC,
    created: card.created,
    updated: card.updated,
    deleted: card.deleted || null,
  };

  if (options.includeAccessCode) {
    serialized.access_code = card.access_code || null;
  }

  if (options.includeCreatorReference !== false) {
    serialized.creator_reference = card.creator_reference;
  }

  if (!serialized.service_rates) {
    delete serialized.service_rates;
  }

  return serialized;
}

function buildSlugFromTitle(title) {
  const loweredTitle = title.toLowerCase().trim();
  let slug = loweredTitle.split('').reduce((currentSlug, char) => {
    const previousWasHyphen = currentSlug.endsWith('-');
    const isWhitespace = char === ' ' || char === '\t' || char === '\n';

    if (isWhitespace) {
      return !previousWasHyphen && currentSlug ? `${currentSlug}-` : currentSlug;
    }

    if (isAlphaNumeric(char) || char === '-' || char === '_') {
      return `${currentSlug}${char}`;
    }

    return currentSlug;
  }, '');

  while (slug.endsWith('-')) {
    slug = slug.slice(0, -1);
  }

  return slug;
}

function randomSuffix(length = 6) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let output = '';

  for (let index = 0; index < length; index += 1) {
    output += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return output;
}

function isDraft(card) {
  return card.status === CARD_STATUSES.DRAFT;
}

module.exports = {
  buildSlugFromTitle,
  ensureAccessCodeRules,
  isDraft,
  isValidSlug,
  randomSuffix,
  serializeCreatorCard,
  throwBusinessError,
};
