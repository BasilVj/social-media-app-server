const express = require("express");
const cors = require("cors");
const { createHandler } = require("graphql-http/lib/use/express");

const schema = require("./Schemas/index");

const app = express();
const PORT = process.env.PORT | 8080;

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.use(
  "/graphql",
  createHandler({
    schema, // graphql schema
  })
);

app.listen(PORT, () => {
  console.log(`server running in PORT : ${PORT}`);
});
