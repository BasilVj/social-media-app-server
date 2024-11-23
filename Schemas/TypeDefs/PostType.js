const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLInputObjectType,
} = require("graphql");

const MentionInputType = new GraphQLInputObjectType({
  name: "MentionInputType",
  fields: {
    userId: { type: GraphQLString },
    username: { type: GraphQLString },
  },
});

// Output Type for PostType mentions field
const MentionType = new GraphQLObjectType({
  name: "Mention",
  fields: {
    userId: { type: GraphQLString },
    username: { type: GraphQLString },
  },
});

const PostType = new GraphQLObjectType({
  name: "posts",
  fields: () => ({
    description: { type: GraphQLString },
    imageUrl: { type: GraphQLString },
    userId: { type: GraphQLString },
    postedTime: { type: GraphQLString },
    mentions: { type: new GraphQLList(MentionType) },
  }),
});

module.exports = { PostType, MentionInputType };
