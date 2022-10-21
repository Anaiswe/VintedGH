// packages
const express = require("express");
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;
const router = express.Router();

const isAuthenticated = require("../middlewares/isAuthenticated");
const convertToBase64 = require("../functions/convertToBase64");

const Offer = require("../models/Offer");

router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      const { title, condition, price, description, city, brand, size, color } =
        req.body;
      const newOffer = new Offer({
        product_name: title,
        product_description: description,
        product_price: price,
        product_details: [
          { MARQUE: brand },
          { TAILLE: size },
          { ÉTAT: condition },
          { COULEUR: color },
          { EMPLACEMENT: city },
        ],
        owner: req.user,
      });
      if (req.files?.picture) {
        const result = await cloudinary.uploader.upload(
          convertToBase64(req.files.picture)
        );
        newOffer.product_image = result;
      }
      console.log(newOffer);
      await newOffer.save();
      res.json(newOffer);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.get("/offers", async (req, res) => {
  try {
    const { title, priceMin, priceMax, sort, page } = req.query;
    const filters = {};
    if (title) {
      filters.product_name = new RegExp(title, "i");
    }
    if (priceMin) {
      filters.product_price = { $gte: Number(priceMin) };
    }
    if (priceMax) {
      if (!filters.product_price) {
        filters.product_price = { $lte: Number(priceMax) };
      } else {
        filters.product_price.$lte = Number(priceMax);
      }
    }
    const sortFilters = {};
    if (sort === "price-desc") {
      sortFilters.product_price = "desc";
    } else if (sort === "price-asc") {
      sortFilters.product_price = "asc";
    }
    const limit = 10;
    let pageRequired = 1;
    if (page) {
      pageRequired = Number(page);
    }
    const skip = (pageRequired - 1) * limit;
    const offers = await Offer.find(filters)
      .sort(sortFilters)
      .skip(skip)
      .limit(limit)
      .populate({ path: "owner", select: "account_id" });
    const countOffers = await Offer.countDocuments(filters);
    console.log(countOffers);
    console.log(offers);
    res.json({ count: countOffers, offers: offers });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/offer/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate({
      path: "owner",
      select: "account_id",
    });
    res.json(offer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
module.exports = router;
