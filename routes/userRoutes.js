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
const { getProducts, getProductById,productfilter } = require("../controllers/productContrrollers");

const {
   addToCart,
  increaseQty,
  decreaseQty,
  removeFromCart,
  clearCart,
  getCart
} = require("../controllers/cartControllers.js")

const {placeOrder,
  updateOrderStatus,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getUserOrder
} =require("../controllers/orderController.js")

const {getNavbarData,
getHeaderBySlug} = require("../controllers/navbarControllers.js")
const{addFavorite,
removeFavorite,
getFavorites} = require("../controllers/favoritesControllers.js")

const {
  addBanner,
  getBanners,
  getActiveBanners,
  updateBanner,
  deleteBanner,
} = require("../controllers/bannerController");
const {
  createPromotional,
  getPromotions,
  getPromotionById,
  updatePromotion,
  deletePromotion,
} = require("../controllers/promotionalController");

const express = require('express'); 
const verifyJWT = require("../middlewares/verifyJWT");
const router = express.Router();

router.post("/sentOTP", sentOTP);
router.post("/verifyOTP", verifyOTP);
router.post("/googleLogin", loginWithGoogle);
router.post("/facebookLogin", loginWithFacebook);
router.get("/products", getProducts);
router.get("/productsfilter", productfilter);
router.get("/products/:id", getProductById);
router.get("/navbar",getNavbarData)
router.get("/banner",getActiveBanners)
router.get("/promotional", getPromotions);
router.use(verifyJWT("CUSTOMER"));
router.post("/completeProfile", completeProfile);
router.get("/profile", getProfile);
router.post("/cart/add", addToCart);
router.post("/cart/increase", increaseQty);
router.post("/cart/decrease", decreaseQty);
router.post("/cart/remove",  removeFromCart);
router.post("/cart/clear", clearCart);
router.get("/cart", getCart);                
router.post("/order/place", placeOrder); 
router.post("/create-order", createRazorpayOrder); 
router.post("/order/verify", verifyRazorpayPayment);
router.post("/favorites",addFavorite) 
router.get("/favorites",getFavorites) 
router.delete("/favorites/:id",removeFavorite) 
router.get("/order",getUserOrder) 

module.exports = router;