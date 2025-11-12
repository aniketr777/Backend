
import asyncHandler from "../utils/asyncHandler.js";  
import jwt from "jsonwebtoken"
import User from "../model/user.model.js";



export const authMiddleware =asyncHandler(
    async(req,res,next)=>{
        try{
            const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","");
        if(!token){
            return res.status(401).json({
                message:"Unauthorized access.No token provided"
            })
        }
        // check token using jwt 
        const decodedToken  = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);

        const user =await User.findById(decodedToken?._id).select("-password -refreshToken ")

        if(!user){
            return res.status(401).json({
                message:"Unauthorized access.User not found"
            })
        }
        req.user = user;
        next();
        }catch(e){
            return res.status(401).json({
                message:"Unauthorized access.Invalid token"
            })
        }
    }
)