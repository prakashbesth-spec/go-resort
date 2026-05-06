// ============================================================
//  API Features – utils/apiFeatures.js
//  Reusable filter, sort, field-select, and paginate class
// ============================================================

class APIFeatures {
  /**
   * @param {mongoose.Query} query    - Mongoose query object
   * @param {Object}         queryStr - req.query object
   */
  constructor(query, queryStr) {
    this.query = query;
    this.queryStr = queryStr;
  }

  // ── Filter ──────────────────────────────────────────────────
  filter() {
    const queryObj = { ...this.queryStr };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
    excludedFields.forEach((field) => delete queryObj[field]);

    // Convert operators: gt → $gt, gte → $gte, etc.
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in|nin)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  // ── Full-text search ────────────────────────────────────────
  search(fields) {
    if (this.queryStr.search) {
      const searchRegex = new RegExp(this.queryStr.search, 'i');
      const searchConditions = fields.map((field) => ({
        [field]: { $regex: searchRegex },
      }));
      this.query = this.query.find({ $or: searchConditions });
    }
    return this;
  }

  // ── Sort ────────────────────────────────────────────────────
  sort() {
    if (this.queryStr.sort) {
      const sortBy = this.queryStr.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  // ── Field limiting ──────────────────────────────────────────
  limitFields() {
    if (this.queryStr.fields) {
      const fields = this.queryStr.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  // ── Pagination ──────────────────────────────────────────────
  paginate(defaultLimit = 12) {
    const page = Math.max(1, parseInt(this.queryStr.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(this.queryStr.limit, 10) || defaultLimit)
    );
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    this.page = page;
    this.limit = limit;
    return this;
  }
}

module.exports = APIFeatures;
