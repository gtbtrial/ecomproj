const express = require("express");
const app=express();
const port = 5000;
app.use(express.urlencoded({extended:false}));
app.use(express.json());
const bcrypt = require('bcrypt');
const fs = require('fs');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const uuid = require('uuid');

// mongoose.connect('mongodb://127.0.0.1:27017/ecomdb').then(() => console.log('Connected to MongoDB!'));

mongoose.connect('mongodb+srv://ecomdbuser:dbpass123@cluster0.fuit9gv.mongodb.net/?retryWrites=true&w=majority').then(() => console.log('Connected to MongoDB!'));

var cors = require('cors')
app.use(cors())

const multer  = require('multer');

const DIR = 'public/uploads';
var picname;

let mystorage = multer.diskStorage({
  destination: (req, file, cb) => 
  {
    cb(null, DIR);
  },
  filename: (req, file, cb) => 
  {
    picname = Date.now() + file.originalname;
    cb(null, picname);
  }
});
let upload = multer({ storage: mystorage });

const transporter = nodemailer.createTransport({
    service : 'hotmail',
    auth : {
        user : 'groceryplanet@hotmail.com',
        pass : 'Grocery123#'
    }
  })

var registerSchema = new mongoose.Schema({name:String,phone:String,username:{type:String,unique:true},password:String,usertype:String, isActive:Boolean,activationToken: String},{versionKey: false})

const registerModel = mongoose.model('register', registerSchema,"register");

//register APIs

app.post("/api/register",async (req,res)=>
{
    var token = uuid.v4();
    const hash = bcrypt.hashSync(req.body.password, 10);
    var newrecord = new registerModel({name:req.body.name,phone:req.body.phone,username:req.body.username,password:hash,usertype:req.body.utype, isActive:false, activationToken:token});

    var result = await newrecord.save();
    console.log(result)
    if(result)
    {
        const mailOptions = {
            from: 'groceryplanet@hotmail.com',
            to: req.body.username,
            subject: 'Account Activation Mail from ShoppingPlaza.com',
            text: `Hello ${req.body.name}\n\nThanks for signing up on our website. Please click on the link below to activate your account and login on our website\n\n http://localhost:3000/activateaccount?token=${token}`
          };
        
          // Use the transport object to send the email
          transporter.sendMail(mailOptions, (error, info) => 
          {
            if (error) {
              console.log(error);
              res.send({msg:'Error sending email'});
            } else 
            {
              console.log('Email sent: ' + info.response);
              res.send({msg:"Message sent successfully"});
            }
          });
        res.send({statuscode:1})
    }
    else
    {
        res.send({statuscode:0})
    }
})

app.get("/api/fetchallmembers",async (req,res)=>
{
    var result = await registerModel.find();
    if(result.length===0)
    {
        res.send({statuscode:0})
    }
    else
    {
        res.send({statuscode:1,membsdata:result})
    }
   
})


app.get("/api/searchmember",async (req,res)=>
{
    var result = await registerModel.findOne({username:req.query.un});
    if(!result)
    {
        res.send({statuscode:0})
    }
    else
    {
        res.send({statuscode:1,membdata:result})
    }   
})

app.post("/api/login",async (req,res)=>
{
    var result = await registerModel.findOne({username:req.body.uname});
    if(!result)
    {
        res.send({statuscode:0})
    }
    else
    {
        var hash = result.password;
        var compareResult = bcrypt.compareSync(req.body.pass, hash); // true or false
        if(compareResult===true)
        {
            res.send({statuscode:1,membdata:result})
        }
        else
        {
            res.send({statuscode:0})
        }
    }   
})

app.delete("/api/delmember/:membid",async (req,res)=>
{
    var result = await registerModel.deleteOne({_id:req.params.membid});
    if(result.deletedCount===1)
    {
        res.send({statuscode:1})
    }
    else
    {
        res.send({statuscode:0})
    }   
})


app.put("/api/changepassword", async function(req, res) 
{
    let udata = await registerModel.findOne({username:req.body.uname});
    if(udata)
    {
      var compresult = bcrypt.compareSync(req.body.currpass, udata.password);

      if(compresult===true)
      {
        const hash = bcrypt.hashSync(req.body.newpass, 10);

        udata.password=hash;
        var updatedrec = await udata.save();
        if(updatedrec)
        {
          res.send({statuscode:1});
        }
        else
        {
          res.send({statuscode:2});
        }
      }
      else
      {
        res.send({statuscode:0})
      }
    }
    else
    {
      res.send({statuscode:-1})
    }
});


//Category APIs

var categorySchema = new mongoose.Schema({catname:String,catpic:String},{versionKey: false})

const categorymodel = mongoose.model('category', categorySchema,"category");


app.post("/api/addcategory",upload.single('picture'),async(req,res)=>
{
    if (!req.file) 
    {
        picname = "noimage.jpg";
    };
    
    var newrecord = new categorymodel({catname:req.body.cname,catpic:picname});

    var result = await newrecord.save();
    console.log(result)
    if(result)
    {
        res.send({statuscode:1})
    }
    else
    {
        res.send({statuscode:0})
    }
})

app.get("/api/fetchallcategories",async (req,res)=>
{
    var result = await categorymodel.find();
    if(result.length===0)
    {
        res.send({statuscode:0})
    }
    else
    {
        res.send({statuscode:1,catdata:result})
    }
   
})


app.put("/api/updatecategory", upload.single('picture'),async (req, res)=>
{
    //var d = new Date();
   
    if (!req.file)
    {
        picname=req.body.oldpicname;
    }
    else
    {
      if(req.body.oldpicname!="noimage.jpg")
      {
        fs.unlink('public/uploads/' + req.body.oldpicname, (err) => 
        {
          if (err)
          {
            console.log(err);
          }
          else
          { 
            console.log('file was deleted');
          }
        });
      }
    }
    var updateresult = await categorymodel.updateOne({ _id: req.body.cid }, { $set: {catname:req.body.cname,catpic:picname}});
    if(updateresult.modifiedCount===1)
    {
        res.send({statuscode:1});
    }
    else
    {
        res.send({statuscode:0})
    }
  });



//SubCat APIs
var subCategorySchema = new mongoose.Schema({catid:String,subcatname:String,subcatpic:String},{versionKey: false})

const subCategoryModel = mongoose.model('subcategory', subCategorySchema,"subcategory");


app.post("/api/addsubcategory",upload.single('picture'),async(req,res)=>
{
    if (!req.file) 
    {
        picname = "noimage.jpg";
    };
    
    var newrecord = new subCategoryModel({catid:req.body.catid,subcatname:req.body.scname,subcatpic:picname});

    var result = await newrecord.save();
    console.log(result)
    if(result)
    {
        res.send({statuscode:1})
    }
    else
    {
        res.send({statuscode:0})
    }
})

app.get("/api/fetchsubcatbycatid",async (req,res)=>
{
    var result = await subCategoryModel.find({catid:req.query.cid});
    if(result.length===0)
    {
        res.send({statuscode:0})
    }
    else
    {
        res.send({statuscode:1,subcatdata:result})
    }   
})

app.get("/api/fetchsubcatbyid",async (req,res)=>
{
    var result = await subCategoryModel.findOne({_id:req.query.subcatid});
    if(!result)
    {
        res.send({statuscode:0})
    }
    else
    {
        res.send({statuscode:1,subcatdata:result})
    }   
})


app.put("/api/updatesubcategory", upload.single('picture'),async (req, res)=>
{
    //var d = new Date();
    if (!req.file)
    {
        picname=req.body.oldpicname;
    }
    else
    {
      if(req.body.oldpicname!="noimage.jpg")
      {
        fs.unlink('public/uploads/' + req.body.oldpicname, (err) => 
        {
          if (err)
          {
            console.log(err);
          }
          else
          { 
            console.log('file was deleted');
          }
        });
      }
    }
    var updateresult = await subCategoryModel.updateOne({ _id: req.body.scid }, { $set: {catid:req.body.cid,subcatname:req.body.scname,subcatpic:picname}});

    if(updateresult.modifiedCount===1)
    {
        res.send({statuscode:1});
    }
    else
    {
        res.send({statuscode:0})
    }
  });

//Product APIs

var productSchema = new mongoose.Schema({catid:String,subcatid:String,prodname:String,rate:Number,discount:Number,stock:Number,descritpion:String,featured:String,prodpic:String,addedon:String},{versionKey: false})

const productModel = mongoose.model('product', productSchema,"product");

app.post("/api/addproduct",upload.single('picture'),async(req,res)=>
{
    if (!req.file) 
    {
        picname = "noimage.jpg";
    };
    
    var newrecord = new productModel({catid:req.body.catid,subcatid:req.body.subcatid,prodname:req.body.pname,rate:req.body.rate,discount:req.body.discount,stock:req.body.stock,descritpion:req.body.description,featured:req.body.featured,prodpic:picname,addedon:new Date});

    var result = await newrecord.save();
    console.log(result)
    if(result)
    {
        res.send({statuscode:1})
    }
    else
    {
        res.send({statuscode:0})
    }
})

app.get("/api/fetchprodsbysubcatid/:scid",async (req,res)=>
{
    var result = await productModel.find({subcatid:req.params.scid});
    if(result.length===0)
    {
        res.send({statuscode:0})
    }
    else
    {
        res.send({statuscode:1,prodsdata:result})
    }   
})

app.get("/api/fetchprodbyid/:pid",async (req,res)=>
{
    var result = await productModel.findOne({_id:req.params.pid});
    if(!result)
    {
        res.send({statuscode:0})
    }
    else
    {
        res.send({statuscode:1,proddata:result})
    }   
})

app.get("/api/searchproducts/:term", async(req, res)=>
{
  var searchtext=req.params.term;
  var result = await productModel.find({prodname: { $regex: '.*' + searchtext ,$options:'i' }});
    if (!result)
    {
        res.json({statuscode:0})
    }
    else
    {     
        res.send({statuscode:1,prodsdata:result});
    }
});

app.get("/api/fetchlatestproducts",async (req,res)=>
{
    var result = await productModel.find().sort({"addedon":-1}).limit(6);
    if(result.length===0)
    {
        res.send({statuscode:0})
    }
    else
    {
        res.send({statuscode:1,prodsdata:result})
    }
   
})

app.get("/api/fetchfeaturedproducts",async (req,res)=>
{
    var result = await productModel.find({featured:"yes"}).limit(6);
    if(result.length===0)
    {
        res.send({statuscode:0})
    }
    else
    {
        res.send({statuscode:1,prodsdata:result})
    }
   
})

//Cart APIs

var cartSchema = new mongoose.Schema({prodid:String,name:String,rate:Number,qty:Number,tcost:Number,prodpic:String,username:String},{versionKey: false})

const cartModel = mongoose.model('cart', cartSchema,"cart");

app.post("/api/addtocart",async (req,res)=>
{
    var newrecord = new cartModel({prodid:req.body.pid,name:req.body.prodname,rate:req.body.rate,qty:req.body.qty,tcost:req.body.tcost,prodpic:req.body.picname,username:req.body.uname});

    var result = await newrecord.save();
    console.log(result)
    if(result)
    {
        res.send({statuscode:1})
    }
    else
    {
        res.send({statuscode:0})
    }
})

app.get("/api/fetchcart/:uname",async (req,res)=>
{
    var result = await cartModel.find({username:req.params.uname});
    if(result.length===0)
    {
        res.send({statuscode:0})
    }
    else
    {
        res.send({statuscode:1,cartdata:result})
    }   
})

//checkout/order APIs
var orderSchema = new mongoose.Schema({address:String,orderamt:Number,pmode:String,username:String,OrderDate:String,carddetails:Object,status:String,items:[Object]},{versionKey: false})

const orderModel = mongoose.model('Orders', orderSchema,"Orders");

app.post("/api/saveorder",async (req,res)=>
{
    var orderdt = new Date();
    var newrecord = new orderModel({address:req.body.address,orderamt:req.body.orderamt,pmode:req.body.pmode,username:req.body.uname,OrderDate:orderdt,carddetails:req.body.carddetails,status:req.body.status,items:req.body.cartdata});

    var result = await newrecord.save();
    console.log(result)
    if(result)
    {
        let updateresp=false;
        var updatelist=req.body.cartdata;//updatelist becomes an array becoz we are saving an json array into it
        for(let x=0;x<updatelist.length;x++)
        {
            var updateresult = await productModel.updateOne({_id:updatelist[x].prodid},{$inc: {"stock":-updatelist[x].qty}});
            if(updateresult.modifiedCount===1)
            {
                updateresp=true;
            }
            else
            {
                updateresp=false;
            }
        }

        if(updateresp==true)
        {
            var delres = cartModel.deleteMany({username:req.body.uname})
            if((await delres).deletedCount>=1)
            {
                res.json({statuscode:1});
            }
            else
            {
                res.json({statuscode:0});
            }
        }
        else
        {
            res.json({statuscode:0});
        }
    }
    else
    {
        res.send({statuscode:0})
    }
})

app.get("/api/fetchorderdetails",async (req,res)=>
{
    var result = await orderModel.findOne({username:req.query.un}).sort({"OrderDate":-1});
    console.log(result)
    if(!result)
    {
        res.send({statuscode:0})
    }
    else
    {
        res.send({statuscode:1,orderdata:result})
    }   
})

app.get("/api/fetchorders",async (req,res)=>
{
    var result = await orderModel.find().sort({"OrderDate":-1});
    if(result.length===0)
    {
        res.send({statuscode:0})
    }
    else
    {
        res.send({statuscode:1,ordersdata:result})
    }
   
})

app.get("/api/fetchuserorders/:uname",async (req,res)=>
{
    var result = await orderModel.find({username:req.params.uname}).sort({"OrderDate":-1});
    if(result.length===0)
    {
        res.send({statuscode:0})
    }
    else
    {
        res.send({statuscode:1,ordersdata:result})
    }
   
})

app.get("/api/fetchordersitems/:oid",async (req,res)=>
{
    var result = await orderModel.findOne({_id:req.params.oid});
    if(!result)
    {
        res.send({statuscode:0})
    }
    else
    {
        res.send({statuscode:1,orderitems:result.items})
    }
   
})

app.put("/api/updatestatus", async (req, res)=>
{
    var updateresult = await orderModel.updateOne({ _id: req.body.oid }, { $set: {status:req.body.newst}});
    if(updateresult.modifiedCount===1)
    {
        res.send({statuscode:1});
    }
    else
    {
        res.send({statuscode:0})
    }
  });


  app.post("/api/contactus",async (req, res)=> 
  {
      const mailOptions = {
      from: 'groceryplanet@hotmail.com',
      to: 'gtbtrial@gmail.com',
      subject: 'Message from Website - Contact Us',
      text: `Name:- ${req.body.name}\nPhone:-${req.body.phone}\nEmail:-${req.body.email}\nMessage:-${req.body.message}`
    };
  
    // Use the transport object to send the email
    transporter.sendMail(mailOptions, (error, info) => 
    {
      if (error) {
        console.log(error);
        res.send({msg:'Error sending email'});
      } else 
      {
        console.log('Email sent: ' + info.response);
        res.send({msg:"Message sent successfully"});
      }
    });
  
  });
  

  var resetPasswordSchema = new mongoose.Schema({username:String,token:String,exptime:String}, { versionKey: false } );

  var resetpassModel = mongoose.model("resetpass",resetPasswordSchema,"resetpass");
  
  app.get('/api/forgotpassword', async (req, res) => 
  {
    const userdata = await registerModel.findOne({ username: req.query.username });
    if (!userdata) 
    {
      return res.send({msg:'Invalid Username'});
    }
    else
    {
      var resettoken = uuid.v4();
      var minutesToAdd=15;
      var currentDate = new Date();
      var futureDate = new Date(currentDate.getTime() + minutesToAdd*60000);
  
      var newreset = new resetpassModel({username:req.query.username,token:resettoken,exptime:futureDate});
      let saveresult = await newreset.save();
  
      if(saveresult)
      {
        const resetLink = `http://localhost:3000/resetpassword?token=${resettoken}`;
        const mailOptions = {
        from: 'groceryplanet@hotmail.com',
        to: req.query.username,
        subject: 'Reset your password::ShoppingPlaza.com',
        text: `Hi ${userdata.name},\n\n Please click on the following link to reset your password: \n\n ${resetLink}`
        };
        // Use the transport object to send the email
        transporter.sendMail(mailOptions, (error, info) => 
        {
          if (error) {
            console.log(error);
            res.status(500).send({msg:'Error sending email'});
          } else {
            console.log('Email sent: ' + info.response);
            res.status(200).send({msg:"Please check your mail to reset your password"});
          }
        });
      }
      else
      {
        res.send({msg:"Error, try again"});
      }
    }
    // user.isActive = true;
    // await user.save();
    // return res.status(200).send({msg:'Account activated successfully'});
  });

app.get('/api/checktoken', async (req, res) => 
{
  const resetdata = await resetpassModel.findOne({ token: req.query.token });
  if (!resetdata) 
  {
    return res.send({statuscode:-1,msg:'Invalid Reset Token'});
  }
  else
  {
    console.log(resetdata);
    var exptime = new Date(resetdata.exptime);//07th June 12:27:52
    var currenttime = new Date();//7th June 12:22:21

    if(currenttime<exptime)
    {
      res.send({statuscode:1,username:resetdata.username})
    }
    else
    {
      return res.send({statuscode:0,msg:'Link Expired. It was valid for 15 mins only. Request new link'});
    }
  }
});


    app.use(express.static(__dirname));

    // app.get("/",function(req, res) 
    // {
    //     res.sendFile(path.resolve(__dirname,"/index.html"));
    // });

app.use("*",function(req, res) 
{
  res.sendFile(__dirname + "/index.html");
});

app.listen(port,()=>
{
    console.log("Server is running...");
})