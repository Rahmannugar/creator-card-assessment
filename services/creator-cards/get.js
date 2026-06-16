const { CreatorCardMessages } = require('@app/messages');
const CreatorCardRepository = require('@app/repository/creator-card');
const { ACCESS_TYPES, BUSINESS_ERROR_CODES } = require('./constants');
const { isDraft, serializeCreatorCard, throwBusinessError } = require('./helpers');

async function getCreatorCard(serviceData) {
  const card = await CreatorCardRepository.findOne({
    query: { slug: serviceData.slug, deleted: null },
  });

  if (!card) {
    throwBusinessError(CreatorCardMessages.NOT_FOUND, BUSINESS_ERROR_CODES.NOT_FOUND, 404);
  }

  if (isDraft(card)) {
    throwBusinessError(CreatorCardMessages.NOT_FOUND, BUSINESS_ERROR_CODES.DRAFT_NOT_FOUND, 404);
  }

  if (card.access_type === ACCESS_TYPES.PRIVATE && !serviceData.access_code) {
    throwBusinessError(
      CreatorCardMessages.PRIVATE_ACCESS_CODE_REQUIRED,
      BUSINESS_ERROR_CODES.PRIVATE_ACCESS_CODE_REQUIRED,
      403
    );
  }

  if (card.access_type === ACCESS_TYPES.PRIVATE && serviceData.access_code !== card.access_code) {
    throwBusinessError(
      CreatorCardMessages.INVALID_ACCESS_CODE,
      BUSINESS_ERROR_CODES.INVALID_ACCESS_CODE,
      403
    );
  }

  // Keep creator_reference out of public responses; it is needed for deletion.
  return serializeCreatorCard(card, { includeCreatorReference: false });
}

module.exports = getCreatorCard;
