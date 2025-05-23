const Joi = require("joi");
const fs = require("fs");
const Blog = require("../models/blog");
const {
  BACKEND_SERVER_PATH,
  CLOUD_NAME,
  API_SECRET,
  API_KEY,
} = require("../config/index");
const BlogDTO = require("../dto/blog");
const BlogDetailsDTO = require("../dto/blog-details");
const Appointment = require('../models/appointment');
const AppointmentDTO = require('../dto/appointment');
const Comment = require("../models/comment");
const Favorite=require('../models/favorites')
const path = require('path'); 
const { type } = require("os");
const cloudinary = require("cloudinary").v2;
const streamifier = require('streamifier');
// Configuration
 cloudinary.config({ 
        cloud_name: 'dxxvqqcbd', 
        api_key: '664511295759937', 
        api_secret: 'T5rx4GbXAYylXSip623SnXUYUcQ' // Click 'View API Keys' above to copy your API secret
    });
const mongodbIdPattern = /^[0-9a-fA-F]{24}$/;

const blogController = {


  async create(req, res, next) {
    console.log(req.body);
    console.log('inside crearteeeeeeeee')
  const createBlogSchema = Joi.object({
    title: Joi.string().required(),
    author: Joi.string().regex(mongodbIdPattern).required(),
    content: Joi.string().required(),
    type: Joi.string().valid('food', 'rental').required(),
    price: Joi.number().required(),
  });

  const { error } = createBlogSchema.validate(req.body);
  if (error) return next(error);
console.log('no error ')
  const { title, author, content, type, price } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'Photo file is required' });
  }

  let photoUrl;

    try {
    console.log('inside try')
    // Upload buffer using cloudinary upload_stream
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
      folder: 'post_photos',     // You can change the folder name if needed
      resource_type: 'auto',    // 👈 this is important for videos
    },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(file.buffer); // send the buffer here
    });

      photoUrl = result.secure_url;
      console.log('photoUrl:', photoUrl);
  } catch (cloudinaryError) {
    console.error('Cloudinary Upload Error:', cloudinaryError);
    return res.status(500).json({ error: 'Failed to upload photo to Cloudinary' });
  }

    try {
    console.log('inside try 2')
    const newBlog = new Blog({
      title,
      author,
      content,
      photoPath: photoUrl,
      type,
      price,
    });

    await newBlog.save();
    await newBlog.populate('author', 'username');

    const blogDto = new BlogDTO(newBlog);
    return res.status(201).json({ blog: blogDto });
  } catch (dbError) {
    return res.status(500).json({ error: 'Failed to save blog to database' });
  }
  },
async  getByAuthor(req, res) {
  try {
    const authorId = req.params.authorId;

    // Validate authorId
    const { error } = Joi.object({
      authorId: Joi.string().pattern(mongodbIdPattern).required()
    }).validate({ authorId });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid author ID format"
      });
    }

    // Fetch blogs with populated authorDetails (excluding sensitive fields)
    const blogs = await Blog.find({ author: authorId })
      .populate({
        path: 'authorDetails',
        select: '-password -__v'
      })
      .sort({ createdAt: -1 })
      .lean();

    if (!blogs.length) {
      return res.status(404).json({
        success: false,
        message: "No blogs found for this author"
      });
    }

    // Restructure blogs to include author data in a cleaner way
    const response = blogs.map(blog => {
      const { authorDetails, ...rest } = blog;
      return {
        ...rest,
        author: authorDetails
      };
    });

    return res.status(200).json({
      success: true,
      count: response.length,
      blogs: response
    });

  } catch (err) {
    console.error("Error fetching blogs by author:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching blogs"
    });
  }
},
  async searchByName(req, res, next) { 
    const title = req.query.title;
  try {
    const blogs = await Blog.find({
      title: { $regex: new RegExp(title, 'i') } // case-insensitive
    });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
  },
  async getAll(req, res, next) {
    try {
      const blogs = await Blog.find({}).populate('author', 'name profileImage');
      const blogsDto = blogs.map(blog => new BlogDTO(blog));

      return res.status(200).json({ blogs: blogsDto });
      
    } catch (error) {
      return next(error);
    }
  },    
  async getById(req, res, next) {
    // validate id
    // response

    const getByIdSchema = Joi.object({
      id: Joi.string().regex(mongodbIdPattern).required(),
    });

    const { error } = getByIdSchema.validate(req.params);

    if (error) {
      return next(error);
    }

    let blog;

    const { id } = req.params;

    try {
      blog = await Blog.findOne({ _id: id }).populate("author");
    } catch (error) {
      return next(error);
    }

    const blogDto = new BlogDetailsDTO(blog);

    return res.status(200).json({ blog: blogDto });
  },
  async update(req, res, next) {
    // validate
    //

    const updateBlogSchema = Joi.object({
      title: Joi.string().required(),
      content: Joi.string().required(),
      author: Joi.string().regex(mongodbIdPattern).required(),
      blogId: Joi.string().regex(mongodbIdPattern).required(),
      photo: Joi.string(),
      price: Joi.number().required(), // Add price validation
    });

    const { error } = updateBlogSchema.validate(req.body);

    const { title, content, author, blogId, photo,price} = req.body;

    // delete previous photo
    // save new photo

    let blog;

    try {
      blog = await Blog.findOne({ _id: blogId });
    } catch (error) {
      return next(error);
    }

    if (photo) {
      let previousPhoto = blog.photoPath;

      previousPhoto = previousPhoto.split("/").at(-1);

      // delete photo
      fs.unlinkSync(`storage/${previousPhoto}`);

      // read as buffer
      // const buffer = Buffer.from(
      //   photo.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""),
      //   "base64"
      // );

      // allot a random name
      // const imagePath = `${Date.now()}-${author}.png`;

      // save locally
      let response;
      try {
        response = await cloudinary.uploader.upload(photo);
        // fs.writeFileSync(`storage/${imagePath}`, buffer);
      } catch (error) {
        return next(error);
      }

      await Blog.updateOne(
        { _id: blogId },
        {
          title,
          content,
          photoPath: response.url,
          price
          
        }
      );
    } else {
      await Blog.updateOne({ _id: blogId }, { title, content });
    }

    return res.status(200).json({ message: "blog updated!" });
  },
async delete(req, res, next) {
  const deleteBlogSchema = Joi.object({
    id: Joi.string().regex(mongodbIdPattern).required(),
  });

  const { error } = deleteBlogSchema.validate(req.params);
  if (error) {
    return next(error);
  }

  const { id } = req.params;

  try {
    // Delete the blog
    await Blog.deleteOne({ _id: id });

    // Delete all comments related to this blog
    await Comment.deleteMany({ blog: id });

    // Remove the blog from all users' favorites
    await Favorite.updateMany(
      { "items.itemId": id }, // Find favorites that contain this blog
      { $pull: { items: { itemId: id } } } // Pull (remove) that item from items array
    );

  } catch (error) {
    return next(error);
  }

  return res.status(200).json({ message: "Blog deleted and removed from favorites" });
}



};

module.exports = blogController;