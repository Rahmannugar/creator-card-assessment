const validator = require('@app-core/validator');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCardRepository = require('@app/repository/creator-card');
const { BUSINESS_ERROR_CODES } = require('./constants');
const { serializeCreatorCard, throwBusinessError } = require('./helpers');

const deleteCardSpec = `root {
  creator_reference string<trim|length:20>
}`;

const parsedDeleteCardSpec = validator.parse(deleteCardSpec);

async function deleteCreatorCard(serviceData) {
  // Destructive actions require the creator-held reference.
  const data = validator.validate(serviceData, parsedDeleteCardSpec);

  // Already-deleted cards continue to behave like missing cards.
  const card = await CreatorCardRepository.findOne({
    query: { slug: serviceData.slug, deleted: null },
  });

  if (!card) {
    throwBusinessError(CreatorCardMessages.NOT_FOUND, BUSINESS_ERROR_CODES.NOT_FOUND, 404);
  }

  // A public slug alone is not enough authority to delete a card.
  if (card.creator_reference !== data.creator_reference) {
    throwBusinessError(CreatorCardMessages.NOT_FOUND, BUSINESS_ERROR_CODES.NOT_FOUND, 404);
  }

  const deletedAt = Date.now();

  // Soft delete preserves the record while removing it from public lookup.
  await CreatorCardRepository.updateOne({
    query: { slug: serviceData.slug, creator_reference: data.creator_reference, deleted: null },
    updateValues: { deleted: deletedAt },
  });

  // Delete returns the creator-facing shape, including the reference.
  return serializeCreatorCard(
    {
      ...card,
      deleted: deletedAt,
      updated: deletedAt,
    },
    { includeAccessCode: true }
  );
}

module.exports = deleteCreatorCard;
