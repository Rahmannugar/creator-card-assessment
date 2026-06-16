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
  const data = validator.validate(serviceData, parsedDeleteCardSpec);

  const card = await CreatorCardRepository.findOne({
    query: { slug: serviceData.slug, deleted: null },
  });

  if (!card) {
    throwBusinessError(CreatorCardMessages.NOT_FOUND, BUSINESS_ERROR_CODES.NOT_FOUND, 404);
  }

  if (card.creator_reference !== data.creator_reference) {
    throwBusinessError(CreatorCardMessages.NOT_FOUND, BUSINESS_ERROR_CODES.NOT_FOUND, 404);
  }

  const deletedAt = Date.now();

  await CreatorCardRepository.updateOne({
    query: { slug: serviceData.slug, creator_reference: data.creator_reference, deleted: null },
    updateValues: { deleted: deletedAt },
  });

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
