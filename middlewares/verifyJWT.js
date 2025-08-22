const jwt = require("jsonwebtoken");

const verifyJWT = (role) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader?.startsWith("Bearer"))
      return res.status(200).json({
        status: false,
        message: "Token is Required",
        data: null,
      });
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.log(err);
        return res.status(200).json({
          status: false,
          message: "Invalid token !!!",
          data: null,
        }); //invalid token
      } else if (role !== decoded.ROLE)
        return res.status(200).json({
          status: false,
          message: `Not an ${role} !!!`,
          data: null,
        });
      req.ID = decoded.ID;
      req.ROLE = decoded.ROLE;
      next();
    });
  };
};

module.exports = verifyJWT;
