import express from "express"
import q2m from "query-to-mongo"
import BooksModel from "./model.js"

const booksRouter = express.Router()

booksRouter.get("/", async (req, res, next) => {
  try {
    const mongoQuery = q2m(req.query)

    const total = await BooksModel.countDocuments(mongoQuery.criteria)

    const books = await BooksModel.find(mongoQuery.criteria, mongoQuery.options.fields)
      .limit(mongoQuery.options.limit) // No matter the order of usage of these 3 options, Mongo will ALWAYS go with SORT, then SKIP, then LIMIT
      .skip(mongoQuery.options.skip)
      .sort(mongoQuery.options.sort)
    res.send({
      links: mongoQuery.links("http://localhost:3001/books", total),
      totalPages: Math.ceil(total / mongoQuery.options.limit),
      books,
    })
  } catch (error) {
    next(error)
  }
})

export default booksRouter
