import mongoose from "mongoose";

const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true
    },
    password:{
        type:String,
        minlength:6,
        default: null  
    },
    googleId:{
        type:String,
        default:null
    },
    phone:{
        type:String,
        default:''
    },
    address:{
        type:String,
        trim:true,
        default:""
    },
    pincode:{ type:String, trim:true, default:"" },
    place:{ type:String, trim:true, default:"" },
    district:{ type:String, trim:true, default:"" },
    profilePicture: { type: String, default: null },
    passwordResetToken:String,
    passwordResetExpires:Date,
    role:{
        type:String,
        enum:["user","admin","owner"],
        default:"user"
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    otp:{
        type:String,
        default:null
    },
    otpExpires:{
        type:Date,
        default:null
    },
    otpPurpose:{ type:String, default:null },
    isVerified:{ type:Boolean, default:true },
    pendingEmail:{ type:String, default:null },
    pendingPassword:{ type:String, default:null },
    walletBalance:{ type:Number, default:0, min:0 },
    walletTransactions:[{
        type:{ type:String, enum:["credit","debit"], required:true },
        amount:{ type:Number, required:true, min:0 },
        reason:{ type:String, required:true },
        description:{ type:String, default:"" },
        booking:{ type:mongoose.Schema.Types.ObjectId, ref:"booking", default:null },
        createdAt:{ type:Date, default:Date.now }
    }]
}, 
{ timestamps: true })
const user=mongoose.model("user",userSchema)
export default user
