import express from "express"
import createHttpError from "http-errors"
import UsersModel from "./model.js"
import BooksModel from "../books/model.js"

const usersRouter = express.Router()

usersRouter.post("/", async (req, res, next) => {
  try {
    const newUser = new UsersModel(req.body)
    // here it happens validation (thanks to Mongoose) of req.body, if it is not ok Mongoose will throw an error
    // if it is ok the user is not saved yet
    const { _id } = await newUser.save()
    res.status(201).send({ _id })
  } catch (error) {
    next(error)
  }
})

usersRouter.get("/", async (req, res, next) => {
  try {
    const users = await UsersModel.find()
    res.send(users)
  } catch (error) {
    next(error)
  }
})

usersRouter.get("/:userId", async (req, res, next) => {
  try {
    const user = await UsersModel.findById(req.params.userId)
    if (user) {
      res.send(user)
    } else {
      next(createHttpError(404, `User with id ${req.params.userId} not found!`))
    }
  } catch (error) {
    next(error)
  }
})

usersRouter.put("/:userId", async (req, res, next) => {
  try {
    const updatedUser = await UsersModel.findByIdAndUpdate(
      req.params.userId, // WHO you want to modify
      req.body, // HOW you want to modify
      { new: true, runValidators: true } // options. By default findByIdAndUpdate returns the record pre-modification. If you want to get back the newly updated record you shall use new:true
      // By default validation is off in the findByIdAndUpdate --> runValidators:true
    )

    // ****************************************** ALTERNATIVE METHOD ********************************************
    /*     const user = await UsersModel.findById(req.params.userId)
    // When you do a findById, findOne,.... you get back a MONGOOSE DOCUMENT which is NOT a normal object
    // It is an object with superpowers, for instance it has the .save() method that will be very useful in some cases
    user.age = 100

    await user.save() */

    if (updatedUser) {
      res.send(updatedUser)
    } else {
      next(createHttpError(404, `User with id ${req.params.userId} not found!`))
    }
  } catch (error) {
    next(error)
  }
})

usersRouter.delete("/:userId", async (req, res, next) => {
  try {
    const deletedUser = await UsersModel.findByIdAndDelete(req.params.userId)

    if (deletedUser) {
      res.status(204).send()
    } else {
      next(createHttpError(404, `User with id ${req.params.userId} not found!`))
    }
  } catch (error) {
    next(error)
  }
})

// ********************************** EMBEDDED EXAMPLE ****************************************************

usersRouter.post("/:userId/purchaseHistory", async (req, res, next) => {
  try {
    // We gonna receive a bookId in the req.body. Given that ID, we would like to insert the corresponding book into the purchase history array of the specified user

    // 1. Find the book by id in the books'collection
    const purchasedBook = await BooksModel.findById(req.body.bookId, { _id: 0 })

    // here we could use projection ({_id: 0}) to remove the _id from the book. In this way Mongo will create automagically a unique _id for every item added to the array

    if (purchasedBook) {
      // 2. If the book is found --> add additional info like purchaseDate
      const bookToInsert = { ...purchasedBook.toObject(), purchaseDate: new Date() }
      // purchasedBook and EVERYTHING comes from a .find(), .findById(),.... is a MONGOOSE DOCUMENT not a normal object!
      // Therefore if you want to spread it probably you should convert it into a plain normal object

      // 3. Update the specified user by adding that book to his/her purchaseHistory array
      const updatedUser = await UsersModel.findByIdAndUpdate(
        req.params.userId, // WHO
        { $push: { purchaseHistory: bookToInsert } }, // HOW
        { new: true, runValidators: true } // OPTIONS
      )

      if (updatedUser) {
        res.send(updatedUser)
      } else {
        next(createHttpError(404, `User with id ${req.params.userId} not found!`))
      }
    } else {
      // 4. In case of either book not found or user not found --> 404
      next(createHttpError(404, `Book with id ${req.body.bookId} not found!`))
    }
  } catch (error) {
    next(error)
  }
})

usersRouter.get("/:userId/purchaseHistory", async (req, res, next) => {
  try {
    const user = await UsersModel.findById(req.params.userId)
    if (user) {
      res.send(user.purchaseHistory)
    } else {
      next(createHttpError(404, `User with id ${req.params.userId} not found!`))
    }
  } catch (error) {
    next(error)
  }
})

usersRouter.get("/:userId/purchaseHistory/:productId", async (req, res, next) => {
  try {
    const user = await UsersModel.findById(req.params.userId)
    if (user) {
      console.log(user)
      const purchasedBook = user.purchaseHistory.find(
        book => book._id.toString() === req.params.productId
      )
      // You CANNOT compare a string (req.params.productId) with an ObjectId (book._id)
      // Solution --> you have to either convert _id into a string or productId into ObjectId
      console.log(purchasedBook)
      if (purchasedBook) {
        res.send(purchasedBook)
      } else {
        next(createHttpError(404, `Product with id ${req.params.productId} not found!`))
      }
    } else {
      next(createHttpError(404, `User with id ${req.params.userId} not found!`))
    }
  } catch (error) {
    next(error)
  }
})

usersRouter.put("/:userId/purchaseHistory/:productId", async (req, res, next) => {
  try {
    // 1. Find User by Id (obtaining MONGOOSE DOCUMENT!)
    const user = await UsersModel.findById(req.params.userId)

    if (user) {
      // 2. Update the item in the array by using normal JS code
      // 2.1 Search for the index of the product into the purchaseHistory array
      const index = user.purchaseHistory.findIndex(
        book => book._id.toString() === req.params.productId
      )
      if (index !== -1) {
        // 2.2 If the product is there --> modify that product with some new data coming from req.body
        user.purchaseHistory[index] = { ...user.purchaseHistory[index].toObject(), ...req.body }
        // 3. Since user object is a MONGOOSE DOCUMENT I can use .save() method to update that record
        await user.save()
        res.send(user)
      } else {
        // 2.3 If product is not there --> 404
        next(createHttpError(404, `Product with id ${req.params.productId} not found!`))
      }
    } else {
      next(createHttpError(404, `User with id ${req.params.userId} not found!`))
    }
  } catch (error) {
    next(error)
  }
})

usersRouter.delete("/:userId/purchaseHistory/:productId", async (req, res, next) => {
  try {
    const updatedUser = await UsersModel.findByIdAndUpdate(
      req.params.userId, // WHO
      { $pull: { purchaseHistory: { _id: req.params.productId } } }, // HOW
      { new: true } // OPTIONS
    )
    if (updatedUser) {
      res.send(updatedUser)
    } else {
      next(createHttpError(404, `User with id ${req.params.userId} not found!`))
    }
  } catch (error) {
    next(error)
  }
})

export default usersRouter
