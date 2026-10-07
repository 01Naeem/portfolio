import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { snapshotAssets, cleanupRemoved, destroyAllIn } from '../services/uploadService.js';

const notFound = (name) => new ApiError(404, `${name} not found`);

export const reorderHandler = (Model) =>
  asyncHandler(async (req, res) => {
    const { ids } = req.body;
    await Model.bulkWrite(ids.map((id, index) => ({ updateOne: { filter: { _id: id }, update: { $set: { order: index } } } })));
    ok(res, { message: 'Order updated' });
  });

// Generic CRUD for simple ordered collections (skills, experience, education, certificates).
export function createCrud({ Model, name, sort = { order: 1, createdAt: 1 }, filterFields = [] }) {
  return {
    list: asyncHandler(async (req, res) => {
      const filter = {};
      for (const f of filterFields) {
        // typeof check blocks object values like ?category[$ne]=x
        if (typeof req.query[f] === 'string' && req.query[f]) filter[f] = req.query[f];
      }
      ok(res, await Model.find(filter).sort(sort).lean());
    }),

    getOne: asyncHandler(async (req, res) => {
      const doc = await Model.findById(req.params.id).lean();
      if (!doc) throw notFound(name);
      ok(res, doc);
    }),

    create: asyncHandler(async (req, res) => {
      const count = await Model.countDocuments();
      const doc = await Model.create({ order: count, ...req.body });
      ok(res, doc, { status: 201 });
    }),

    // find + set + save (not findByIdAndUpdate) so schema hooks and validators always run
    update: asyncHandler(async (req, res) => {
      const doc = await Model.findById(req.params.id);
      if (!doc) throw notFound(name);
      const before = snapshotAssets(doc);
      doc.set(req.body);
      await doc.save();
      await cleanupRemoved(before, doc); // images swapped out in this edit are deleted from Cloudinary
      ok(res, doc);
    }),

    remove: asyncHandler(async (req, res) => {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) throw notFound(name);
      await destroyAllIn(doc);
      ok(res, { message: `${name} deleted` });
    }),

    reorder: reorderHandler(Model),
  };
}
