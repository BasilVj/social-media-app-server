const {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLList,
} = require("graphql");
const admin = require("firebase-admin");
require("dotenv").config();
const {
  FollowersType,
  UserType,
  AddFollowersType,
} = require("./TypeDefs/UserType");
const { PostType, MentionInputType } = require("./TypeDefs/PostType");

const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
};

console.log("project id", serviceAccount.project_id);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const postsCollectionRef = db.collection("posts");
const usersCollectionRef = db.collection("users");
const RootQuery = new GraphQLObjectType({
  name: "RootQuerType",
  fields: {
    getUserPosts: {
      type: new GraphQLList(PostType),
      args: { userId: { type: GraphQLString } },
      async resolve(parent, args) {
        const { userId } = args;
        const querySnapshot = await postsCollectionRef
          .where("userId", "==", userId)
          .get();
        const filteredPosts = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            postedTime: data.postedTime
              ? data.postedTime.toDate().toISOString()
              : null, // Convert to ISO string
            mentions: data.mentions || [],
          };
        });
        return filteredPosts;
      },
    },
    getFollowersPosts: {
      type: new GraphQLList(PostType), // Assuming PostType represents the structure of a post
      args: { userId: { type: GraphQLString } },
      async resolve(parent, args) {
        const { userId } = args;

        try {
          // Fetch the user document based on userId
          const userDocSnapshot = await usersCollectionRef
            .where("userId", "==", userId)
            .get();

          if (userDocSnapshot.empty) {
            console.log("User not found");
            return []; // Return an empty array if the user is not found
          }

          let userDocData;
          userDocSnapshot.forEach((doc) => {
            userDocData = doc.data();
          });

          // Extract followers list
          const followers = userDocData.followers || [];

          if (followers.length === 0) {
            console.log("No followers for this user");
            return []; // Return an empty array if there are no followers
          }

          console.log("Followers:", followers);

          // Fetch posts for each follower
          const posts = [];
          for (const follower of followers) {
            const followerId = follower.userId; // Extract userId from the follower object

            const querySnapshot = await postsCollectionRef
              .where("userId", "==", followerId)
              .get();

            console.log(
              `Posts for follower ${followerId}:`,
              querySnapshot.docs.map((doc) => doc.data())
            );

            querySnapshot.forEach((doc) => {
              const data = doc.data();
              posts.push({
                ...data,
                postedTime: data.postedTime
                  ? data.postedTime.toDate().toISOString()
                  : null,
                mentions: data.mentions || [],
              });
            });
          }

          console.log("Aggregated followers' posts:", posts);

          return posts; // Return the aggregated posts
        } catch (error) {
          console.error("Error fetching followers' posts:", error);
          throw new Error("Failed to fetch followers' posts");
        }
      },
    },

    getCurrentUser: {
      type: UserType,
      args: { userId: { type: GraphQLString } },
      async resolve(parent, args) {
        const { userId } = args;
        try {
          const userDocSnapshot = await usersCollectionRef
            .where("userId", "==", userId)
            .get();

          if (userDocSnapshot.empty) {
            console.log("User not found");
          } else {
            let data;
            userDocSnapshot.forEach((doc) => {
              data = doc.data();
            });
            return data;
          }
        } catch (error) {
          console.log("Error fetching user data:", error); // Log the error for debugging
          return { error: "Failed to fetch user data" };
        }
      },
    },
    getFollowers: {
      type: new GraphQLList(UserType),
      args: { userId: { type: GraphQLString } },
      async resolve(parent, args) {
        const { userId } = args;
        try {
          // Fetch the current user's document
          const userDocSnapshot = await usersCollectionRef
            .where("userId", "==", userId)
            .get();

          if (userDocSnapshot.empty) {
            console.log("User not found");
            return []; // Return empty array if no user found
          }

          let currentUser;
          userDocSnapshot.forEach((doc) => {
            currentUser = doc.data(); // Get the current user's data
          });

          // Assuming the followers are stored in the `followers` field
          const followers = currentUser.followers || [];

          return followers; // Return the array of followers
        } catch (error) {
          console.log("Error fetching followers:", error);
          return []; // Return empty array in case of error
        }
      },
    },

    getSuggestUsers: {
      type: new GraphQLList(UserType),
      args: { userId: { type: GraphQLString } },
      async resolve(parent, args) {
        const { userId } = args;

        try {
          // Fetch the current user document
          const userDoc = await usersCollectionRef
            .where("userId", "==", userId)
            .get();

          if (userDoc.empty) {
            console.log("Current user not found");
            return [];
          }

          let currentUser;
          userDoc.forEach((doc) => {
            currentUser = doc.data();
          });

          // Ensure `followers` is always an array
          const followers = currentUser.followers || [];
          let suggestedUsers;

          if (followers.length === 0) {
            // If no followers, fetch all users except the current user
            const allUsers = await usersCollectionRef.get();
            suggestedUsers = allUsers.docs
              .map((doc) => doc.data())
              .filter((user) => user.userId !== userId); // Exclude the current user
          } else {
            // Fetch all users and exclude followers
            const allUsers = await usersCollectionRef.get();
            suggestedUsers = allUsers.docs
              .map((doc) => doc.data())
              .filter(
                (user) =>
                  !followers.some(
                    (follower) => follower.userId === user.userId
                  ) && user.userId !== userId // Exclude current user
              );
          }

          return suggestedUsers;
        } catch (error) {
          console.log("Error fetching suggested users:", error);
          return [];
        }
      },
    },
  },
});
const Mutation = new GraphQLObjectType({
  name: "Mutation",
  fields: {
    createPost: {
      type: PostType,
      args: {
        description: { type: GraphQLString },
        imageUrl: { type: GraphQLString },
        userId: { type: GraphQLString },
        mentions: { type: new GraphQLList(MentionInputType) },
      },
      async resolve(parent, args) {
        const { description, imageUrl, userId, mentions } = args;

        const post = {
          description,
          imageUrl,
          userId,
          mentions: mentions || [], // Default to an empty array if mentions are not provided
          postedTime: admin.firestore.FieldValue.serverTimestamp(),
        };

        await postsCollectionRef.add(post); // Store the post in the database
        return post;
      },
    },
    createUser: {
      type: UserType,
      args: {
        userId: { type: GraphQLString },
        username: { type: GraphQLString },
        profilePic: { type: GraphQLString },
        /* followers: new GraphQLList(FollowersType), */
      },
      async resolve(parent, args) {
        await usersCollectionRef.add({
          userId: args.userId,
          username: args.username,
          profilePic: args.profilePic,
          followers: [],
        });
        return args;
      },
    },
    updateUserProfilePic: {
      type: UserType, // Assuming UserType represents the structure of a user document
      args: {
        userId: { type: GraphQLString }, // The user's ID to identify the document
        profilePic: { type: GraphQLString }, // The new profile picture URL
      },
      async resolve(parent, args) {
        const { userId, profilePic } = args;

        try {
          // Find the user document by userId
          const userDocSnapshot = await usersCollectionRef
            .where("userId", "==", userId)
            .get();

          if (userDocSnapshot.empty) {
            console.log("User not found");
            return null; // Return null if no user is found
          }

          let userDocId;
          userDocSnapshot.forEach((doc) => {
            userDocId = doc.id; // Get the document ID
          });

          // Update the profilePic field
          await usersCollectionRef.doc(userDocId).update({
            profilePic,
          });

          console.log(`Profile picture updated for user ${userId}`);

          // Return updated data
          return { userId, profilePic }; // Optionally return the updated fields
        } catch (error) {
          console.error("Error updating profile picture:", error);
          throw new Error("Failed to update profile picture");
        }
      },
    },

    addFollower: {
      type: AddFollowersType,
      args: {
        currentUserId: { type: GraphQLString }, // ID of the user being followed
        followerId: { type: GraphQLString },
        followerUsername: { type: GraphQLString }, // ID of the user who is following
      },
      async resolve(parent, args) {
        const { currentUserId, followerId, followerUsername } = args;

        try {
          // Fetch the current user document
          const userQuerySnapshot = await usersCollectionRef
            .where("userId", "==", currentUserId)
            .get();

          if (userQuerySnapshot.empty) {
            console.log("User not found");
            return null;
          }

          let currentUserDoc;
          let currentUserData;
          userQuerySnapshot.forEach((doc) => {
            currentUserDoc = doc;
            currentUserData = doc.data();
          });

          // Ensure `followers` is an array
          const followers = currentUserData.followers || [];

          // Check if the `followerId` is already in the followers list
          if (!followers.some((follower) => follower.userId === followerId)) {
            // Add the new follower to the `followers` array
            followers.push({ userId: followerId, username: followerUsername });

            // Update the user document in Firestore
            await currentUserDoc.ref.update({ followers });
          } else {
            console.log(`User ${followerId} is already a follower`);
          }

          // Return the updated user data
          return { ...currentUserData, followers };
        } catch (error) {
          console.log("Error adding follower:", error);
          return null;
        }
      },
    },
    removeFollower: {
      type: UserType,
      args: {
        currentUserId: { type: GraphQLString },
        followerId: { type: GraphQLString },
      },
      async resolve(parent, args) {
        const { currentUserId, followerId } = args;

        try {
          // Fetch user document by userId
          const userDocSnapshot = await usersCollectionRef
            .where("userId", "==", currentUserId)
            .get();

          if (userDocSnapshot.empty) {
            console.log("User not found");
            return null;
          }

          let userDocId;
          let userData;

          userDocSnapshot.forEach((doc) => {
            userDocId = doc.id;
            userData = doc.data();
          });

          // Remove follower
          const currentFollowers = userData.followers || [];
          const updatedFollowers = currentFollowers.filter(
            (follower) => follower.userId !== followerId
          );

          await usersCollectionRef.doc(userDocId).update({
            followers: updatedFollowers,
          });

          console.log("Successfully updated followers:", updatedFollowers);

          // Return updated data
          return { ...userData, followers: updatedFollowers };
        } catch (error) {
          console.error("Error in removeFollower:", error);
          throw new Error("Failed to remove follower");
        }
      },
    },
  },
});

module.exports = new GraphQLSchema({ query: RootQuery, mutation: Mutation });
