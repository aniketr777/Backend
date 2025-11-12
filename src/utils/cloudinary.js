import {v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config({path:'./.env'});
// console.log("CLOUDINARY_API_KEY from index.js:", process.env.API_KEY);
cloudinary.config({
    cloud_name:process.env.CLOUD_NAME,
    api_key:process.env.API_KEY,
    api_secret:process.env.API_SECRET
});


export const  uploadOnCloudinary =  async(localfilePath)=>{
    try{
        // console.log(process.env.API_KEY);
        if(!localfilePath) return null;
        
        const response =await cloudinary.uploader.upload(localfilePath,{
            resource_type:"auto",
        });
        
        console.log("File uploaded on cloudinary successfully",response.secure_url);
        fs.unlinkSync(localfilePath);
        return response
    }
    catch(e){
      fs.unlinkSync(localfilePath);
      console.error("Cloudinary upload failed:", e);
      return null; 
    }
}
