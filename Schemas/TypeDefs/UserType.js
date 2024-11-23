const { GraphQLObjectType, GraphQLString, GraphQLList } = require("graphql");

const FollowersType = new GraphQLObjectType({
  name: "FollowersType",
  fields: {
    userId: { type: GraphQLString },
    username: { type: GraphQLString },
  },
});

const AddFollowersType = new GraphQLObjectType({
  name: "AddFollowersType",
  fields: {
    currentUserId: { type: GraphQLString },
    followerId: { type: GraphQLString },
    followerUsername: { type: GraphQLString },
  },
});

const UserType = new GraphQLObjectType({
  name: "User",
  fields: () => ({
    userId: { type: GraphQLString },
    username: { type: GraphQLString },
    profilePic: { type: GraphQLString },
    followers: {
      type: new GraphQLList(FollowersType),
      nullable: true,
    },
  }),
});

module.exports = { FollowersType, UserType, AddFollowersType };
