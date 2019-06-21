/* Copyright 2019 Schibsted */

const Joi = require('@hapi/joi');
const Counter = require('../../../common/models/counter');
const JournalModel = require('../../../common/models/journal');

const isEmptyQuery = function(values) {
  return (
    (values.projectId ||
      values.sourceId ||
      values.from ||
      values.to ||
      values.term ||
      values.caseNumber) === undefined
  );
};

const isOnlyProjectQuery = function(values) {
  return (
    values.projectId &&
    !(
      values.sourceId ||
      values.from ||
      values.to ||
      values.term ||
      values.caseNumber
    )
  );
};

const isOnlySourceQuery = function(values) {
  return (
    values.sourceId &&
    !(
      values.projectId ||
      values.from ||
      values.to ||
      values.term ||
      values.caseNumber
    )
  );
};

/**
 *
 */
class CountController {
  async read(req, res, next) {
    const schema = Joi.object()
      .keys({
        projectId: Joi.number().allow('', null),
        sourceId: Joi.number().allow('', null),
        term: Joi.string(),
        from: Joi.date(),
        to: Joi.date(),
        term: Joi.string(),
        caseNumber: Joi.string(),
      })
      .unknown(true);

    const { error, value: searchParams } = Joi.validate(req.query, schema);

    if (error) next(new Error(error));

    const { projectId, sourceId, from, to, term, caseNumber } = searchParams;

    try {
      let result = [];

      if (
        isEmptyQuery(searchParams) ||
        isOnlyProjectQuery(searchParams) ||
        isOnlySourceQuery(searchParams)
      ) {
        const data = await Counter.fetch({
          project_id: projectId,
          source_id: sourceId,
        });

        result = data.reduce((acc, { count }) => acc + count, 0);
      } else {
        result = await JournalModel.count({
          project_id: projectId,
          source_id: sourceId,
          from,
          to,
          term,
          caseNumber,
        });
      }

      return res.json(result);
    } catch (err) {
      return res.status(404).json({ error: 'count', content: err });
    }
  }
}

const instance = new CountController();
Object.freeze(instance);

module.exports = instance;