const {sentOTP,
    verifyOTP,
    loginWithGoogle,
    loginWithFacebook,
    completeProfile,
    getProfile,
} = require('../controllers/useControllers');

const { 
    getHeaders, 
    getHeader, 
    createHeader, 
    updateHeader, 
    deleteHeader 
} = require( "../controllers/headerController.js");

const { 
    getCategories, 
    createCategory,
    updateCategory,
    deleteCategory 
} =require( "../controllers/categoryController.js")

const {
  getSubCategories,
  getSubCategory,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} = require('../controllers/subCategoryController.js');

const {
  getCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
} = require('../controllers/collectionController.js')
const { getProducts, getProductById } = require("../controllers/productContrrollers");

const {
   addToCart,
  increaseQty,
  decreaseQty,
  removeFromCart,
  clearCart,
} = require("../controllers/cartControllers.js")

const express = require('express'); 
const verifyJWT = require("../middlewares/verifyJWT");
const router = express.Router();

router.post("/sentOTP", sentOTP);
router.post("/verifyOTP", verifyOTP);
router.post("/googleLogin", loginWithGoogle);
router.post("/facebookLogin", loginWithFacebook);
router.get("/products", getProducts);
router.get("/products/:id", getProductById);
router.use(verifyJWT("CUSTOMER"));
router.post("/completeProfile", completeProfile);
router.post("/Profile", getProfile);
router.post("/add", addToCart);
router.post("/increase", increaseQty);
router.post("/decrease", decreaseQty);
router.post("/remove",  removeFromCart);
router.post("/clear", clearCart);


module.exports = router;