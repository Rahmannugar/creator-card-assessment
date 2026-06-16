const validator = require('@app-core/validator');
const { ERROR_CODE } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCardRepository = require('@app/repository/creator-card');
const { ACCESS_TYPES, BUSINESS_ERROR_CODES, SUPPORTED_CURRENCIES } = require('./constants');
const {
  buildSlugFromTitle,
  ensureAccessCodeRules,
  isValidSlug,
  randomSuffix,
  serializeCreatorCard,
  throwBusinessError,
} = require('./helpers');

const createCardSpec = `root {
  title string<trim|minLength:3|maxLength:100>
  description? string<trim|maxLength:500>
  slug? string<trim|minLength:5|maxLength:50>
  creator_reference string<trim|length:20>
  links[]? {
    title string<trim|minLength:1|maxLength:100>
    url string<trim|maxLength:200>
  }
  service_rates? {
    currency string<uppercase>(NGN|USD|GBP|GHS)
    rates[] {
      name string<trim|minLength:3|maxLength:100>
      description? string<trim|maxLength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<trim|length:6>
}`;

const parsedCreateCardSpec = validator.parse(createCardSpec);

function validateUrl(url) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throwBusinessError('links.url must start with http:// or https://', 'SPCL_VALIDATION', 400);
  }
}

function validatePositiveInteger(value, fieldName) {
  if (!Number.isInteger(value) || value < 1) {
    throwBusinessError(`${fieldName} must be a positive integer`, 'SPCL_VALIDATION', 400);
  }
}

async function ensureSlugIsAvailable(slug) {
  const existingCard = await CreatorCardRepository.findOne({
    query: { slug },
  });

  if (existingCard) {
    throwBusinessError(CreatorCardMessages.SLUG_TAKEN, BUSINESS_ERROR_CODES.SLUG_TAKEN, 400);
  }
}

async function generateAvailableSlug(title) {
  const baseSlug = buildSlugFromTitle(title);
  let slug = baseSlug;

  // Short titles need a suffix so generated slugs still satisfy the minimum length.
  if (slug.length < 5) {
    slug = `${slug || 'card'}-${randomSuffix()}`;
  }

  // Auto-generated slugs may collide, so keep trying bounded suffixes.
  async function findAvailableSlug(candidateSlug, attempt = 0) {
    const existingCard = await CreatorCardRepository.findOne({ query: { slug: candidateSlug } });

    if (!existingCard) return candidateSlug;

    if (attempt >= 10) {
      throwBusinessError(CreatorCardMessages.SLUG_TAKEN, BUSINESS_ERROR_CODES.SLUG_TAKEN, 400);
    }

    return findAvailableSlug(`${baseSlug || 'card'}-${randomSuffix()}`, attempt + 1);
  }

  return findAvailableSlug(slug);
}

async function createCreatorCard(serviceData) {
  // Let VSL handle shape checks before applying service defaults.
  const data = validator.validate(serviceData, parsedCreateCardSpec);
  data.access_type = data.access_type || ACCESS_TYPES.PUBLIC;
  data.links = data.links || [];

  // Keep custom business rules close to the use case that owns them.
  if (data.slug && !isValidSlug(data.slug)) {
    throwBusinessError(
      'slug can only contain letters, numbers, hyphens and underscores',
      'SPCL_VALIDATION',
      400
    );
  }

  ensureAccessCodeRules(data);

  data.links.forEach((link) => validateUrl(link.url));

  if (data.service_rates) {
    if (!SUPPORTED_CURRENCIES.includes(data.service_rates.currency)) {
      throwBusinessError('service_rates.currency is not supported', 'SPCL_VALIDATION', 400);
    }

    if (!data.service_rates.rates?.length) {
      throwBusinessError('service_rates.rates must be a non-empty array', 'SPCL_VALIDATION', 400);
    }

    data.service_rates.rates.forEach((rate) => {
      validatePositiveInteger(rate.amount, 'service_rates.rates.amount');
    });
  }

  // Client-provided slugs are never silently changed.
  if (data.slug) {
    await ensureSlugIsAvailable(data.slug);
  } else {
    data.slug = await generateAvailableSlug(data.title);
  }

  if (data.access_type === ACCESS_TYPES.PUBLIC) {
    data.access_code = null;
  }

  let createdCard;

  try {
    // The unique index is the final guard against concurrent slug races.
    createdCard = await CreatorCardRepository.create(data);
  } catch (error) {
    if (error.errorCode === ERROR_CODE.DUPLRCRD) {
      throwBusinessError(CreatorCardMessages.SLUG_TAKEN, BUSINESS_ERROR_CODES.SLUG_TAKEN, 400);
    }

    throw error;
  }

  return serializeCreatorCard(createdCard, { includeAccessCode: true });
}

module.exports = createCreatorCard;
