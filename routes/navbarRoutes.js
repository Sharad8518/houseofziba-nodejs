const {addNavbarItem,
getNavbarItem,
editNavbarItem,
getNavbarItemById,
deleteNavbarItem} = require("../controllers/navbarControllers")

const express = require('express'); 

const router = express.Router();


// Create a navbar item (category or subcategory)
router.post("/navbar", addNavbarItem);
router.get("/navbar", getNavbarItem);
router.get("/navbar/:id", getNavbarItemById);  // optional
router.put("/navbar/:id", editNavbarItem);
router.delete("/navbar/:id", deleteNavbarItem);
