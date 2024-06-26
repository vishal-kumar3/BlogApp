import { Blog } from "../models/blog.models.js";
import { User } from "../models/user.models.js";
import { Like } from "../models/likes.models.js";
import { Comment } from "../models/comment.models.js";
import { View } from "../models/views.models.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloud } from "../utils/cloudinary.js";
import mongoose from "mongoose";

export const createBlog = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user) {
    throw new ApiError(
      401,
      "unauthorised user, you must be logged in to post blogs"
    );
  }

  console.log(req.file)

  const { title, description, content, status } = req.body;

  if (
    [title, description, content].some(
      (field) => !field || field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "Both title and description are required!!!");
  }

  const thumbnailLocalPath = req.file && req.file?.path;

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail not provided");
  }

  const thumbnail = await uploadOnCloud(thumbnailLocalPath);

  if (!thumbnail) {
    throw new ApiError(500, "Unable to upload thumbnail");
  }

  const blog = await Blog.create({
    title,
    description,
    content,
    owner: user._id,
    status,
    thumbnail : thumbnail.url
  });

  if (!blog) {
    throw new ApiError(500, "Error while creating blog!!!");
  }

  const userBlogUpdate = await User.findById(user._id).select("-password -refreshToken -role");

  userBlogUpdate.blogs.unshift(blog._id);
  await userBlogUpdate.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        blog,
        user: userBlogUpdate,
      },
      "Blog created successfully"
    )
  );
});

export const uploadThumbnail = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user) {
    throw new ApiError(401, "Login to perform these actions");
  }

  const thumbnailLocalPath = req.files?.thumbnail && req.files.thumbnail[0]?.path;

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail not provided");
  }

  const thumbnail = await uploadOnCloud(thumbnailLocalPath);

  if (!thumbnail) {
    throw new ApiError(500, "Unable to upload thumbnail");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        thumbnail: thumbnail.url || null
      },
      "Thumbnail uploaded successfully"
    )
  );
})

export const uploadBlogImage = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user) {
    throw new ApiError(401, "Login to perform these actions");
  }

  const imagesLocalPath = req.files?.images && req.files.images[0]?.path;

  if (!imagesLocalPath) {
    throw new ApiError(400, "Image not provided");
  }

  const images = await uploadOnCloud(imagesLocalPath);

  if (!images) {
    throw new ApiError(500, "Unable to upload images");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        images: images.url || null
      },
      "Image uploaded successfully"
    )
  );
});

export const updateStatus = asyncHandler(async (req, res) => {
  const user = req.user;
  const blogId = req.params.id;
  const { status } = req.body;

  if (!user) {
    throw new ApiError(401, "Login to perform these actions");
  }

  if (!blogId) {
    throw new ApiError(400, "invalid blog id");
  }

  if (!status || status.trim() === "") {
    throw new ApiError(400, "Status is required");
  }

  const blog = await Blog.findByIdAndUpdate(blogId, 
    {
      $set: {
        status,
      },
    },
    {
      new: true
    }
  );

  if (!blog) {
    throw new ApiError(500, "Error while updating the status");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        blog, status
      },
      "Status updated successfully"
    )
  );
})

export const getAllBlogs = asyncHandler(async (req, res) => {
  const blogs = await Blog.find({ status : "published" }).sort({ createdAt: -1});

  if (!blogs) {
    throw new ApiError(500, "Error while fetching all the blogs");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        blogs,
      },
      "Fetched all blogs successfully"
    )
  );
});

export const deleteBlog = asyncHandler(async (req, res) => {
  const blogId = req.params.id;
  const user = req.user;

  if (!blogId) {
    throw new ApiError(400, "invalid blog id");
  }

  if (!user) {
    throw new ApiError(401, "Login to perform these actions");
  }

  const blog = await Blog.findById(blogId);

  if (!blog) {
    throw new ApiError(400, "Invalid Blog Id");
  }

  if (!(String(user._id) == String(blog.owner))) {
    throw new ApiError(
      401,
      "You are unauthorised to delete blogs of other users"
    );
  }

  const userDeleteBlog = await User.findById(user._id);

  if (!userDeleteBlog) {
    throw new ApiError(401, "Unauthorized to delete this blog");
  }

  const blogObjectId = new mongoose.Types.ObjectId(`${blogId}`);

  const blogViews = await View.aggregate([
    {
      $match: {
        blog: blogObjectId,
      },
    },
    {
      $project: {
        _id: 1,
      },
    },
  ]);

  let blogViewsList = [];

  blogViews.filter((viewsId) => {
    blogViewsList.push(viewsId._id);
  });

  const viewsDelete = await View.deleteMany({ _id: blogViewsList });

  if (!viewsDelete) {
    throw new ApiError(500, "Error while deleting blog's views");
  }

  const blogLikes = await Like.aggregate([
    {
      $match: {
        blog: blogObjectId,
      },
    },
    {
      $project: {
        _id: 1,
      },
    },
  ]);

  let blogLikesList = [];

  blogLikes.filter((likesId) => {
    blogLikesList.push(likesId._id);
  });

  const likesDelete = await Like.deleteMany({ _id: blogLikesList });

  if (!likesDelete) {
    throw new ApiError(500, "Not able to delete blog's likes");
  }

  const comments = blog.comment;

  const deletedComments = await Comment.deleteMany({ _id: comments });

  if (!deletedComments) {
    throw new ApiError(500, "Not able to delete blog's comment");
  }

  console.log(deletedComments);

  const deletedBlog = await Blog.findByIdAndDelete(blogId);

  if (!deletedBlog) {
    throw new ApiError(500, "Error while deleting blog");
  }

  user.blogHistory = user.blogHistory.filter((blog_Id) => {
    return String(blog_Id) !== String(blogId);
  });
  user.blogs = user.blogs.filter((blog_Id) => {
    return String(blog_Id) !== String(blogId);
  });
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        deleteBlog,
        History: user.blogHistory,
        blogs: user.blogs,
        user,
      },
      "Blog Deleted Successfully"
    )
  );
});

export const updateBlog = asyncHandler(async (req, res) => {
  const user = req.user;
  const blogId = req.params.id;
  const { title, description } = req.body;

  if (!user) {
    throw new ApiError(401, "Login to perform these actions");
  }

  if (!blogId) {
    throw new ApiError(400, "invalid blog id");
  }

  const blog = await Blog.findById(blogId);

  if (!blog) {
    throw new ApiError(400, "Invalid Blog Id");
  }

  if (!(String(user._id) == String(blog.owner))) {
    throw new ApiError(
      401,
      "You are unauthorised to delete blogs of other users"
    );
  }

  if ([title, description].some((field) => !field || field?.trim() === "")) {
    throw new ApiError(400, "Both title and description are required!!!");
  }

  const updatedBlog = await Blog.findByIdAndUpdate(
    blogId,
    {
      $set: {
        title,
        description,
      },
    },
    { new: true }
  );

  if (!updatedBlog) {
    throw new ApiError(500, "Error while updating the blog");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        updatedBlog,
      },
      "Updated blog successfully"
    )
  );
});

export const likeBlog = asyncHandler(async (req, res) => {
  const user = req.user;
  // yaha checks lgana baaki h if same user baar baar like krde to

  if (!user) {
    throw new ApiError(401, "Login to like this blog");
  }

  const userLikedBlogs = await User.findById(user._id);

  if (!userLikedBlogs) {
    throw new ApiError(404, "User not found!!!");
  }

  const blogId = req.params.id;

  if (!blogId) {
    throw new ApiError(400, "Invalid user id");
  }

  const blogObjectId = new mongoose.Types.ObjectId(`${blogId}`);

  // agar koi banda pehle se isko like kiye hoga to uska views document bana hoga to usme check krte h
  const ifAlreadyLikedBySameUser = await Like.aggregate([
    {
      $match: {
        blog: blogObjectId,
        likedBy: user._id,
      },
    },
  ]);

  if (ifAlreadyLikedBySameUser.length > 0) {
    // yaha delete krdo like
    // abhi nhi banaye h...

    const deleteLike = await Like.findByIdAndDelete(
      ifAlreadyLikedBySameUser[0]._id
    );

    if (!deleteLike) {
      throw new ApiError(500, "Unable to unlike this post, Try again later");
    }

    const blog = await Blog.findById(blogId);

    if (!blog) {
      return new ApiError(
        500,
        "Blog is unliked but not updated on the blog noOfLikes!!!"
      );
    }

    blog.noOfLikes -= 1;
    await blog.save({ validateBeforeSave: false });

    console.log("unlike kr rhe h");

    userLikedBlogs.likedBlogs = userLikedBlogs.likedBlogs.filter(
      (likedBlogId) => {
        return String(likedBlogId) !== String(blogId);
      }
    );
    console.log(userLikedBlogs.likedBlogs);
    await userLikedBlogs.save({ validateBeforeSave: false });
    return res
      .status(200)
      .json(
        new ApiResponse(200, { blog, userLikedBlogs }, "User unliked the blog")
      );
  }

  const likesDocument = await Like.create({
    blog: blogId,
    likedBy: user._id,
  });

  if (!likesDocument) {
    throw new ApiError(500, "Error while registering the like");
  }

  const blog = await Blog.findByIdAndUpdate(
    blogId,
    {
      $inc: {
        noOfLikes: 1,
      },
    },
    { new: true }
  );

  if (!blog) {
    throw new ApiError(500, "Error while updating the likes of blog");
  }

  userLikedBlogs.likedBlogs.unshift(blogId);
  await userLikedBlogs.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        blog,
        likesDocument,
        userLikedBlogs,
      },
      "Successfully liked the blog"
    )
  );
});

export const getBlogById = asyncHandler(async (req, res) => {
  const blogId = req.params.id;

  if (!blogId) {
    throw new ApiError(400, "Blog id is required");
  }

  const blog = await Blog.findById(blogId);

  if (!blog) {
    throw new ApiError(400, "Blog id is invalid");
  }

  if(blog.status !== "published"){
    throw new ApiError(400, "Blog does not exist");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        blog,
      },
      "fetched blog successfully"
    )
  );
});

export const viewBlog = asyncHandler(async (req, res) => {
  const blogId = req.params.id;
  const user = req.user;

  if (!blogId) {
    throw new ApiError(400, "Blog id is required");
  }

  const blog = await Blog.findById(blogId);

  if (!blog) {
    throw new ApiError(400, "Blog id is invalid");
  }

  if (!user) {
    return res.status(200).json(new ApiResponse(200, { blog }, "View not registered since user is not logged in!!!"));
  }

  const isViewed = await View.findOne({ user: user._id, blog: blogId });

  if(isViewed){
    return res.status(200).json(new ApiResponse(200, { blog }, "View not registered since user has already viewed this blog!!!"));
  }

  await View.create({
    blog: blogId,
    user: user._id,
  });

  const userHistory = await User.findById(user._id);

  if (!userHistory) {
    throw new ApiError(500, "Error while fetching user data");
  }

  if (!userHistory.blogHistory.includes(blogId)) {
    await User.updateOne(
      { _id: user._id },
      { $push: { blogHistory: { $each: [blogId], $position: 0 } } }
    );
  }

  await Blog.updateOne(
    { _id: blogId },
    { $inc: { noOfViews: 1 } }
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        blog,
      },
      "Blog viewed"
    )
  );
});


export const comment = asyncHandler(async (req, res) => {
  const blogId = req.params.id;
  const user = req.user;

  if (!blogId) {
    throw new ApiError(400, "Blog id is invalid");
  }

  if (!user) {
    throw new ApiError(401, "Only logged in users can comment");
  }

  const { content } = req.body;

  if (!content || content.trim() === "") {
    throw new ApiError(400, "Comment cannot be empty");
  }

  const comment = await Comment.create({
    content,
    owner: user._id,
    blog: blogId,
  });

  if (!comment) {
    throw new ApiError(
      500,
      "Error while creating comment!!! Please try again later"
    );
  }

  const blog = await Blog.findById(blogId);

  if (!blog) {
    throw new ApiError(400, "Error while fetching the blog");
  }

  blog.comment.push(comment._id);
  await blog.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        comment,
        blog,
      },
      "comment posted successfully"
    )
  );
});

export const searchBlog = asyncHandler(async (req, res) => {
  const { title, tag } = req.query;
  const searchQuery = [];

  
  if (title) {
    searchQuery.push(
      { title: { $regex: new RegExp(title, "gi") }},
      { description: { $regex: new RegExp(title, "gi")}},
    );
  }

  if (tag || tag?.length > 0) {
    searchQuery.push({ tags: { $in: tag } });
  }

  const blogs = await Blog.find({
    $or: searchQuery,
    $and: [{status : "published"}],
  })?.select("title description id")?.sort({createdAt : -1});

  if (!blogs) {
    throw new ApiError(500, "Error while fetching the blogs");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        blogs,
      },
      "Fetched blogs successfully"
    )
  );
})