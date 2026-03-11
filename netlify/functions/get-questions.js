import { getDb, initSchema } from "./db.js";

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SEED = [
  {lc:1,name:"Two Sum",url:"https://leetcode.com/problems/two-sum/",topic:"Arrays & Hashing",difficulty:"Easy",section:"Arrays & Hashing",so:1},
  {lc:49,name:"Group Anagrams",url:"https://leetcode.com/problems/group-anagrams/",topic:"Arrays & Hashing",difficulty:"Medium",section:"Arrays & Hashing",so:1},
  {lc:128,name:"Longest Consecutive Sequence",url:"https://leetcode.com/problems/longest-consecutive-sequence/",topic:"Arrays & Hashing",difficulty:"Medium",section:"Arrays & Hashing",so:1},
  {lc:238,name:"Product of Array Except Self",url:"https://leetcode.com/problems/product-of-array-except-self/",topic:"Arrays & Hashing",difficulty:"Medium",section:"Arrays & Hashing",so:1},
  {lc:347,name:"Top K Frequent Elements",url:"https://leetcode.com/problems/top-k-frequent-elements/",topic:"Arrays & Hashing",difficulty:"Medium",section:"Arrays & Hashing",so:1},
  {lc:271,name:"Encode and Decode Strings",url:"https://leetcode.com/problems/encode-and-decode-strings/",topic:"Arrays & Hashing",difficulty:"Medium",section:"Arrays & Hashing",so:1},
  {lc:36,name:"Valid Sudoku",url:"https://leetcode.com/problems/valid-sudoku/",topic:"Arrays & Hashing",difficulty:"Medium",section:"Arrays & Hashing",so:1},
  {lc:560,name:"Subarray Sum Equals K",url:"https://leetcode.com/problems/subarray-sum-equals-k/",topic:"Arrays & Hashing",difficulty:"Medium",section:"Arrays & Hashing",so:1},
  {lc:41,name:"First Missing Positive",url:"https://leetcode.com/problems/first-missing-positive/",topic:"Arrays & Hashing",difficulty:"Hard",section:"Arrays & Hashing",so:1},
  {lc:380,name:"Insert Delete GetRandom O(1)",url:"https://leetcode.com/problems/insert-delete-getrandom-o1/",topic:"Arrays & Hashing",difficulty:"Medium",section:"Arrays & Hashing",so:1},
  {lc:454,name:"4Sum II",url:"https://leetcode.com/problems/4sum-ii/",topic:"Arrays & Hashing",difficulty:"Medium",section:"Arrays & Hashing",so:1},
  {lc:442,name:"Find All Duplicates in an Array",url:"https://leetcode.com/problems/find-all-duplicates-in-an-array/",topic:"Arrays & Hashing",difficulty:"Medium",section:"Arrays & Hashing",so:1},
  {lc:525,name:"Contiguous Array",url:"https://leetcode.com/problems/contiguous-array/",topic:"Arrays & Hashing",difficulty:"Medium",section:"Arrays & Hashing",so:1},
  {lc:56,name:"Merge Intervals",url:"https://leetcode.com/problems/merge-intervals/",topic:"Arrays & Intervals",difficulty:"Medium",section:"Arrays & Hashing",so:1},
  {lc:57,name:"Insert Interval",url:"https://leetcode.com/problems/insert-interval/",topic:"Arrays & Intervals",difficulty:"Medium",section:"Arrays & Hashing",so:1},
  {lc:435,name:"Non-overlapping Intervals",url:"https://leetcode.com/problems/non-overlapping-intervals/",topic:"Arrays & Intervals",difficulty:"Medium",section:"Arrays & Hashing",so:1},
  {lc:253,name:"Meeting Rooms II",url:"https://leetcode.com/problems/meeting-rooms-ii/",topic:"Arrays & Intervals",difficulty:"Medium",section:"Arrays & Hashing",so:1},
  {lc:125,name:"Valid Palindrome",url:"https://leetcode.com/problems/valid-palindrome/",topic:"Two Pointers",difficulty:"Easy",section:"Two Pointers",so:2},
  {lc:167,name:"Two Sum II - Input Array Is Sorted",url:"https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/",topic:"Two Pointers",difficulty:"Medium",section:"Two Pointers",so:2},
  {lc:15,name:"3Sum",url:"https://leetcode.com/problems/3sum/",topic:"Two Pointers",difficulty:"Medium",section:"Two Pointers",so:2},
  {lc:18,name:"4Sum",url:"https://leetcode.com/problems/4sum/",topic:"Two Pointers",difficulty:"Medium",section:"Two Pointers",so:2},
  {lc:11,name:"Container With Most Water",url:"https://leetcode.com/problems/container-with-most-water/",topic:"Two Pointers",difficulty:"Medium",section:"Two Pointers",so:2},
  {lc:42,name:"Trapping Rain Water",url:"https://leetcode.com/problems/trapping-rain-water/",topic:"Two Pointers",difficulty:"Hard",section:"Two Pointers",so:2},
  {lc:283,name:"Move Zeroes",url:"https://leetcode.com/problems/move-zeroes/",topic:"Two Pointers",difficulty:"Easy",section:"Two Pointers",so:2},
  {lc:26,name:"Remove Duplicates from Sorted Array",url:"https://leetcode.com/problems/remove-duplicates-from-sorted-array/",topic:"Two Pointers",difficulty:"Easy",section:"Two Pointers",so:2},
  {lc:80,name:"Remove Duplicates from Sorted Array II",url:"https://leetcode.com/problems/remove-duplicates-from-sorted-array-ii/",topic:"Two Pointers",difficulty:"Medium",section:"Two Pointers",so:2},
  {lc:881,name:"Boats to Save People",url:"https://leetcode.com/problems/boats-to-save-people/",topic:"Two Pointers",difficulty:"Medium",section:"Two Pointers",so:2},
  {lc:121,name:"Best Time to Buy and Sell Stock",url:"https://leetcode.com/problems/best-time-to-buy-and-sell-stock/",topic:"Sliding Window",difficulty:"Easy",section:"Sliding Window",so:3},
  {lc:3,name:"Longest Substring Without Repeating Characters",url:"https://leetcode.com/problems/longest-substring-without-repeating-characters/",topic:"Sliding Window",difficulty:"Medium",section:"Sliding Window",so:3},
  {lc:424,name:"Longest Repeating Character Replacement",url:"https://leetcode.com/problems/longest-repeating-character-replacement/",topic:"Sliding Window",difficulty:"Medium",section:"Sliding Window",so:3},
  {lc:567,name:"Permutation in String",url:"https://leetcode.com/problems/permutation-in-string/",topic:"Sliding Window",difficulty:"Medium",section:"Sliding Window",so:3},
  {lc:76,name:"Minimum Window Substring",url:"https://leetcode.com/problems/minimum-window-substring/",topic:"Sliding Window",difficulty:"Hard",section:"Sliding Window",so:3},
  {lc:239,name:"Sliding Window Maximum",url:"https://leetcode.com/problems/sliding-window-maximum/",topic:"Sliding Window",difficulty:"Hard",section:"Sliding Window",so:3},
  {lc:209,name:"Minimum Size Subarray Sum",url:"https://leetcode.com/problems/minimum-size-subarray-sum/",topic:"Sliding Window",difficulty:"Medium",section:"Sliding Window",so:3},
  {lc:438,name:"Find All Anagrams in a String",url:"https://leetcode.com/problems/find-all-anagrams-in-a-string/",topic:"Sliding Window",difficulty:"Medium",section:"Sliding Window",so:3},
  {lc:904,name:"Fruit Into Baskets",url:"https://leetcode.com/problems/fruit-into-baskets/",topic:"Sliding Window",difficulty:"Medium",section:"Sliding Window",so:3},
  {lc:1004,name:"Max Consecutive Ones III",url:"https://leetcode.com/problems/max-consecutive-ones-iii/",topic:"Sliding Window",difficulty:"Medium",section:"Sliding Window",so:3},
  {lc:20,name:"Valid Parentheses",url:"https://leetcode.com/problems/valid-parentheses/",topic:"Stack",difficulty:"Easy",section:"Stack & Queue",so:4},
  {lc:155,name:"Min Stack",url:"https://leetcode.com/problems/min-stack/",topic:"Stack",difficulty:"Medium",section:"Stack & Queue",so:4},
  {lc:150,name:"Evaluate Reverse Polish Notation",url:"https://leetcode.com/problems/evaluate-reverse-polish-notation/",topic:"Stack",difficulty:"Medium",section:"Stack & Queue",so:4},
  {lc:22,name:"Generate Parentheses",url:"https://leetcode.com/problems/generate-parentheses/",topic:"Stack",difficulty:"Medium",section:"Stack & Queue",so:4},
  {lc:739,name:"Daily Temperatures",url:"https://leetcode.com/problems/daily-temperatures/",topic:"Monotonic Stack",difficulty:"Medium",section:"Stack & Queue",so:4},
  {lc:853,name:"Car Fleet",url:"https://leetcode.com/problems/car-fleet/",topic:"Stack",difficulty:"Medium",section:"Stack & Queue",so:4},
  {lc:84,name:"Largest Rectangle in Histogram",url:"https://leetcode.com/problems/largest-rectangle-in-histogram/",topic:"Monotonic Stack",difficulty:"Hard",section:"Stack & Queue",so:4},
  {lc:85,name:"Maximal Rectangle",url:"https://leetcode.com/problems/maximal-rectangle/",topic:"Monotonic Stack",difficulty:"Hard",section:"Stack & Queue",so:4},
  {lc:394,name:"Decode String",url:"https://leetcode.com/problems/decode-string/",topic:"Stack",difficulty:"Medium",section:"Stack & Queue",so:4},
  {lc:496,name:"Next Greater Element I",url:"https://leetcode.com/problems/next-greater-element-i/",topic:"Monotonic Stack",difficulty:"Easy",section:"Stack & Queue",so:4},
  {lc:503,name:"Next Greater Element II",url:"https://leetcode.com/problems/next-greater-element-ii/",topic:"Monotonic Stack",difficulty:"Medium",section:"Stack & Queue",so:4},
  {lc:735,name:"Asteroid Collision",url:"https://leetcode.com/problems/asteroid-collision/",topic:"Stack",difficulty:"Medium",section:"Stack & Queue",so:4},
  {lc:895,name:"Maximum Frequency Stack",url:"https://leetcode.com/problems/maximum-frequency-stack/",topic:"Stack",difficulty:"Hard",section:"Stack & Queue",so:4},
  {lc:232,name:"Implement Queue using Stacks",url:"https://leetcode.com/problems/implement-queue-using-stacks/",topic:"Queue",difficulty:"Easy",section:"Stack & Queue",so:4},
  {lc:206,name:"Reverse Linked List",url:"https://leetcode.com/problems/reverse-linked-list/",topic:"Linked List",difficulty:"Easy",section:"Linked Lists",so:5},
  {lc:21,name:"Merge Two Sorted Lists",url:"https://leetcode.com/problems/merge-two-sorted-lists/",topic:"Linked List",difficulty:"Easy",section:"Linked Lists",so:5},
  {lc:143,name:"Reorder List",url:"https://leetcode.com/problems/reorder-list/",topic:"Linked List",difficulty:"Medium",section:"Linked Lists",so:5},
  {lc:19,name:"Remove Nth Node From End of List",url:"https://leetcode.com/problems/remove-nth-node-from-end-of-list/",topic:"Linked List",difficulty:"Medium",section:"Linked Lists",so:5},
  {lc:138,name:"Copy List with Random Pointer",url:"https://leetcode.com/problems/copy-list-with-random-pointer/",topic:"Linked List",difficulty:"Medium",section:"Linked Lists",so:5},
  {lc:2,name:"Add Two Numbers",url:"https://leetcode.com/problems/add-two-numbers/",topic:"Linked List",difficulty:"Medium",section:"Linked Lists",so:5},
  {lc:141,name:"Linked List Cycle",url:"https://leetcode.com/problems/linked-list-cycle/",topic:"Linked List",difficulty:"Easy",section:"Linked Lists",so:5},
  {lc:142,name:"Linked List Cycle II",url:"https://leetcode.com/problems/linked-list-cycle-ii/",topic:"Linked List",difficulty:"Medium",section:"Linked Lists",so:5},
  {lc:287,name:"Find the Duplicate Number",url:"https://leetcode.com/problems/find-the-duplicate-number/",topic:"Linked List (Floyd's)",difficulty:"Medium",section:"Linked Lists",so:5},
  {lc:146,name:"LRU Cache",url:"https://leetcode.com/problems/lru-cache/",topic:"Linked List & HashMap",difficulty:"Medium",section:"Linked Lists",so:5},
  {lc:23,name:"Merge k Sorted Lists",url:"https://leetcode.com/problems/merge-k-sorted-lists/",topic:"Linked List & Heap",difficulty:"Hard",section:"Linked Lists",so:5},
  {lc:25,name:"Reverse Nodes in k-Group",url:"https://leetcode.com/problems/reverse-nodes-in-k-group/",topic:"Linked List",difficulty:"Hard",section:"Linked Lists",so:5},
  {lc:148,name:"Sort List",url:"https://leetcode.com/problems/sort-list/",topic:"Linked List",difficulty:"Medium",section:"Linked Lists",so:5},
  {lc:234,name:"Palindrome Linked List",url:"https://leetcode.com/problems/palindrome-linked-list/",topic:"Linked List",difficulty:"Easy",section:"Linked Lists",so:5},
  {lc:460,name:"LFU Cache",url:"https://leetcode.com/problems/lfu-cache/",topic:"Linked List & HashMap",difficulty:"Hard",section:"Linked Lists",so:5},
  {lc:704,name:"Binary Search",url:"https://leetcode.com/problems/binary-search/",topic:"Binary Search",difficulty:"Easy",section:"Binary Search",so:6},
  {lc:74,name:"Search a 2D Matrix",url:"https://leetcode.com/problems/search-a-2d-matrix/",topic:"Binary Search",difficulty:"Medium",section:"Binary Search",so:6},
  {lc:875,name:"Koko Eating Bananas",url:"https://leetcode.com/problems/koko-eating-bananas/",topic:"Binary Search on Answer",difficulty:"Medium",section:"Binary Search",so:6},
  {lc:153,name:"Find Minimum in Rotated Sorted Array",url:"https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/",topic:"Binary Search",difficulty:"Medium",section:"Binary Search",so:6},
  {lc:33,name:"Search in Rotated Sorted Array",url:"https://leetcode.com/problems/search-in-rotated-sorted-array/",topic:"Binary Search",difficulty:"Medium",section:"Binary Search",so:6},
  {lc:34,name:"Find First and Last Position of Element",url:"https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/",topic:"Binary Search",difficulty:"Medium",section:"Binary Search",so:6},
  {lc:981,name:"Time Based Key-Value Store",url:"https://leetcode.com/problems/time-based-key-value-store/",topic:"Binary Search",difficulty:"Medium",section:"Binary Search",so:6},
  {lc:4,name:"Median of Two Sorted Arrays",url:"https://leetcode.com/problems/median-of-two-sorted-arrays/",topic:"Binary Search",difficulty:"Hard",section:"Binary Search",so:6},
  {lc:410,name:"Split Array Largest Sum",url:"https://leetcode.com/problems/split-array-largest-sum/",topic:"Binary Search on Answer",difficulty:"Hard",section:"Binary Search",so:6},
  {lc:1011,name:"Capacity To Ship Packages Within D Days",url:"https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/",topic:"Binary Search on Answer",difficulty:"Medium",section:"Binary Search",so:6},
  {lc:162,name:"Find Peak Element",url:"https://leetcode.com/problems/find-peak-element/",topic:"Binary Search",difficulty:"Medium",section:"Binary Search",so:6},
  {lc:104,name:"Maximum Depth of Binary Tree",url:"https://leetcode.com/problems/maximum-depth-of-binary-tree/",topic:"Binary Tree",difficulty:"Easy",section:"Binary Trees",so:7},
  {lc:226,name:"Invert Binary Tree",url:"https://leetcode.com/problems/invert-binary-tree/",topic:"Binary Tree",difficulty:"Easy",section:"Binary Trees",so:7},
  {lc:543,name:"Diameter of Binary Tree",url:"https://leetcode.com/problems/diameter-of-binary-tree/",topic:"Binary Tree",difficulty:"Easy",section:"Binary Trees",so:7},
  {lc:110,name:"Balanced Binary Tree",url:"https://leetcode.com/problems/balanced-binary-tree/",topic:"Binary Tree",difficulty:"Easy",section:"Binary Trees",so:7},
  {lc:100,name:"Same Tree",url:"https://leetcode.com/problems/same-tree/",topic:"Binary Tree",difficulty:"Easy",section:"Binary Trees",so:7},
  {lc:572,name:"Subtree of Another Tree",url:"https://leetcode.com/problems/subtree-of-another-tree/",topic:"Binary Tree",difficulty:"Easy",section:"Binary Trees",so:7},
  {lc:102,name:"Binary Tree Level Order Traversal",url:"https://leetcode.com/problems/binary-tree-level-order-traversal/",topic:"Binary Tree (BFS)",difficulty:"Medium",section:"Binary Trees",so:7},
  {lc:199,name:"Binary Tree Right Side View",url:"https://leetcode.com/problems/binary-tree-right-side-view/",topic:"Binary Tree (BFS)",difficulty:"Medium",section:"Binary Trees",so:7},
  {lc:1448,name:"Count Good Nodes in Binary Tree",url:"https://leetcode.com/problems/count-good-nodes-in-binary-tree/",topic:"Binary Tree (DFS)",difficulty:"Medium",section:"Binary Trees",so:7},
  {lc:98,name:"Validate Binary Search Tree",url:"https://leetcode.com/problems/validate-binary-search-tree/",topic:"BST",difficulty:"Medium",section:"Binary Trees",so:7},
  {lc:230,name:"Kth Smallest Element in a BST",url:"https://leetcode.com/problems/kth-smallest-element-in-a-bst/",topic:"BST",difficulty:"Medium",section:"Binary Trees",so:7},
  {lc:105,name:"Construct Binary Tree from Preorder and Inorder",url:"https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/",topic:"Binary Tree",difficulty:"Medium",section:"Binary Trees",so:7},
  {lc:124,name:"Binary Tree Maximum Path Sum",url:"https://leetcode.com/problems/binary-tree-maximum-path-sum/",topic:"Binary Tree (DFS)",difficulty:"Hard",section:"Binary Trees",so:7},
  {lc:297,name:"Serialize and Deserialize Binary Tree",url:"https://leetcode.com/problems/serialize-and-deserialize-binary-tree/",topic:"Binary Tree",difficulty:"Hard",section:"Binary Trees",so:7},
  {lc:236,name:"Lowest Common Ancestor of a Binary Tree",url:"https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/",topic:"Binary Tree",difficulty:"Medium",section:"Binary Trees",so:7},
  {lc:235,name:"Lowest Common Ancestor of a BST",url:"https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/",topic:"BST",difficulty:"Medium",section:"Binary Trees",so:7},
  {lc:703,name:"Kth Largest Element in a Stream",url:"https://leetcode.com/problems/kth-largest-element-in-a-stream/",topic:"Heap",difficulty:"Easy",section:"Heaps / Priority Queues",so:8},
  {lc:215,name:"Kth Largest Element in an Array",url:"https://leetcode.com/problems/kth-largest-element-in-an-array/",topic:"Heap",difficulty:"Medium",section:"Heaps / Priority Queues",so:8},
  {lc:1046,name:"Last Stone Weight",url:"https://leetcode.com/problems/last-stone-weight/",topic:"Heap",difficulty:"Easy",section:"Heaps / Priority Queues",so:8},
  {lc:973,name:"K Closest Points to Origin",url:"https://leetcode.com/problems/k-closest-points-to-origin/",topic:"Heap",difficulty:"Medium",section:"Heaps / Priority Queues",so:8},
  {lc:355,name:"Design Twitter",url:"https://leetcode.com/problems/design-twitter/",topic:"Heap",difficulty:"Medium",section:"Heaps / Priority Queues",so:8},
  {lc:295,name:"Find Median from Data Stream",url:"https://leetcode.com/problems/find-median-from-data-stream/",topic:"Two Heaps",difficulty:"Hard",section:"Heaps / Priority Queues",so:8},
  {lc:502,name:"IPO",url:"https://leetcode.com/problems/ipo/",topic:"Heap & Greedy",difficulty:"Hard",section:"Heaps / Priority Queues",so:8},
  {lc:200,name:"Number of Islands",url:"https://leetcode.com/problems/number-of-islands/",topic:"Graph (DFS/BFS)",difficulty:"Medium",section:"Graphs",so:9},
  {lc:133,name:"Clone Graph",url:"https://leetcode.com/problems/clone-graph/",topic:"Graph (DFS)",difficulty:"Medium",section:"Graphs",so:9},
  {lc:695,name:"Max Area of Island",url:"https://leetcode.com/problems/max-area-of-island/",topic:"Graph (DFS)",difficulty:"Medium",section:"Graphs",so:9},
  {lc:417,name:"Pacific Atlantic Water Flow",url:"https://leetcode.com/problems/pacific-atlantic-water-flow/",topic:"Graph (DFS)",difficulty:"Medium",section:"Graphs",so:9},
  {lc:130,name:"Surrounded Regions",url:"https://leetcode.com/problems/surrounded-regions/",topic:"Graph (DFS)",difficulty:"Medium",section:"Graphs",so:9},
  {lc:994,name:"Rotting Oranges",url:"https://leetcode.com/problems/rotting-oranges/",topic:"Graph (BFS)",difficulty:"Medium",section:"Graphs",so:9},
  {lc:207,name:"Course Schedule",url:"https://leetcode.com/problems/course-schedule/",topic:"Graph (Topological Sort)",difficulty:"Medium",section:"Graphs",so:9},
  {lc:210,name:"Course Schedule II",url:"https://leetcode.com/problems/course-schedule-ii/",topic:"Graph (Topological Sort)",difficulty:"Medium",section:"Graphs",so:9},
  {lc:684,name:"Redundant Connection",url:"https://leetcode.com/problems/redundant-connection/",topic:"Graph (Union Find)",difficulty:"Medium",section:"Graphs",so:9},
  {lc:127,name:"Word Ladder",url:"https://leetcode.com/problems/word-ladder/",topic:"Graph (BFS)",difficulty:"Hard",section:"Graphs",so:9},
  {lc:743,name:"Network Delay Time",url:"https://leetcode.com/problems/network-delay-time/",topic:"Graph (Dijkstra)",difficulty:"Medium",section:"Graphs",so:9},
  {lc:787,name:"Cheapest Flights Within K Stops",url:"https://leetcode.com/problems/cheapest-flights-within-k-stops/",topic:"Graph (Bellman-Ford)",difficulty:"Medium",section:"Graphs",so:9},
  {lc:1584,name:"Min Cost to Connect All Points",url:"https://leetcode.com/problems/min-cost-to-connect-all-points/",topic:"Graph (MST/Prim's)",difficulty:"Medium",section:"Graphs",so:9},
  {lc:329,name:"Longest Increasing Path in a Matrix",url:"https://leetcode.com/problems/longest-increasing-path-in-a-matrix/",topic:"Graph & DP",difficulty:"Hard",section:"Graphs",so:9},
  {lc:208,name:"Implement Trie (Prefix Tree)",url:"https://leetcode.com/problems/implement-trie-prefix-tree/",topic:"Trie",difficulty:"Medium",section:"Tries",so:10},
  {lc:211,name:"Design Add and Search Words Data Structure",url:"https://leetcode.com/problems/design-add-and-search-words-data-structure/",topic:"Trie",difficulty:"Medium",section:"Tries",so:10},
  {lc:212,name:"Word Search II",url:"https://leetcode.com/problems/word-search-ii/",topic:"Trie & Backtracking",difficulty:"Hard",section:"Tries",so:10},
  {lc:14,name:"Longest Common Prefix",url:"https://leetcode.com/problems/longest-common-prefix/",topic:"Trie",difficulty:"Easy",section:"Tries",so:10},
  {lc:1268,name:"Search Suggestions System",url:"https://leetcode.com/problems/search-suggestions-system/",topic:"Trie",difficulty:"Medium",section:"Tries",so:10},
  {lc:78,name:"Subsets",url:"https://leetcode.com/problems/subsets/",topic:"Backtracking",difficulty:"Medium",section:"Recursion & Backtracking",so:11},
  {lc:90,name:"Subsets II",url:"https://leetcode.com/problems/subsets-ii/",topic:"Backtracking",difficulty:"Medium",section:"Recursion & Backtracking",so:11},
  {lc:46,name:"Permutations",url:"https://leetcode.com/problems/permutations/",topic:"Backtracking",difficulty:"Medium",section:"Recursion & Backtracking",so:11},
  {lc:47,name:"Permutations II",url:"https://leetcode.com/problems/permutations-ii/",topic:"Backtracking",difficulty:"Medium",section:"Recursion & Backtracking",so:11},
  {lc:39,name:"Combination Sum",url:"https://leetcode.com/problems/combination-sum/",topic:"Backtracking",difficulty:"Medium",section:"Recursion & Backtracking",so:11},
  {lc:40,name:"Combination Sum II",url:"https://leetcode.com/problems/combination-sum-ii/",topic:"Backtracking",difficulty:"Medium",section:"Recursion & Backtracking",so:11},
  {lc:131,name:"Palindrome Partitioning",url:"https://leetcode.com/problems/palindrome-partitioning/",topic:"Backtracking",difficulty:"Medium",section:"Recursion & Backtracking",so:11},
  {lc:17,name:"Letter Combinations of a Phone Number",url:"https://leetcode.com/problems/letter-combinations-of-a-phone-number/",topic:"Backtracking",difficulty:"Medium",section:"Recursion & Backtracking",so:11},
  {lc:79,name:"Word Search",url:"https://leetcode.com/problems/word-search/",topic:"Backtracking",difficulty:"Medium",section:"Recursion & Backtracking",so:11},
  {lc:51,name:"N-Queens",url:"https://leetcode.com/problems/n-queens/",topic:"Backtracking",difficulty:"Hard",section:"Recursion & Backtracking",so:11},
  {lc:37,name:"Sudoku Solver",url:"https://leetcode.com/problems/sudoku-solver/",topic:"Backtracking",difficulty:"Hard",section:"Recursion & Backtracking",so:11},
  {lc:70,name:"Climbing Stairs",url:"https://leetcode.com/problems/climbing-stairs/",topic:"DP (1D)",difficulty:"Easy",section:"Dynamic Programming",so:12},
  {lc:198,name:"House Robber",url:"https://leetcode.com/problems/house-robber/",topic:"DP (1D)",difficulty:"Medium",section:"Dynamic Programming",so:12},
  {lc:213,name:"House Robber II",url:"https://leetcode.com/problems/house-robber-ii/",topic:"DP (1D)",difficulty:"Medium",section:"Dynamic Programming",so:12},
  {lc:5,name:"Longest Palindromic Substring",url:"https://leetcode.com/problems/longest-palindromic-substring/",topic:"DP (1D/2D)",difficulty:"Medium",section:"Dynamic Programming",so:12},
  {lc:91,name:"Decode Ways",url:"https://leetcode.com/problems/decode-ways/",topic:"DP (1D)",difficulty:"Medium",section:"Dynamic Programming",so:12},
  {lc:322,name:"Coin Change",url:"https://leetcode.com/problems/coin-change/",topic:"DP (1D)",difficulty:"Medium",section:"Dynamic Programming",so:12},
  {lc:518,name:"Coin Change II",url:"https://leetcode.com/problems/coin-change-ii/",topic:"DP (1D)",difficulty:"Medium",section:"Dynamic Programming",so:12},
  {lc:152,name:"Maximum Product Subarray",url:"https://leetcode.com/problems/maximum-product-subarray/",topic:"DP (1D)",difficulty:"Medium",section:"Dynamic Programming",so:12},
  {lc:139,name:"Word Break",url:"https://leetcode.com/problems/word-break/",topic:"DP (1D)",difficulty:"Medium",section:"Dynamic Programming",so:12},
  {lc:300,name:"Longest Increasing Subsequence",url:"https://leetcode.com/problems/longest-increasing-subsequence/",topic:"DP (1D)",difficulty:"Medium",section:"Dynamic Programming",so:12},
  {lc:416,name:"Partition Equal Subset Sum",url:"https://leetcode.com/problems/partition-equal-subset-sum/",topic:"DP (Knapsack)",difficulty:"Medium",section:"Dynamic Programming",so:12},
  {lc:494,name:"Target Sum",url:"https://leetcode.com/problems/target-sum/",topic:"DP (Knapsack)",difficulty:"Medium",section:"Dynamic Programming",so:12},
  {lc:62,name:"Unique Paths",url:"https://leetcode.com/problems/unique-paths/",topic:"DP (2D Grid)",difficulty:"Medium",section:"Dynamic Programming",so:12},
  {lc:64,name:"Minimum Path Sum",url:"https://leetcode.com/problems/minimum-path-sum/",topic:"DP (2D Grid)",difficulty:"Medium",section:"Dynamic Programming",so:12},
  {lc:1143,name:"Longest Common Subsequence",url:"https://leetcode.com/problems/longest-common-subsequence/",topic:"DP (2D)",difficulty:"Medium",section:"Dynamic Programming",so:12},
  {lc:72,name:"Edit Distance",url:"https://leetcode.com/problems/edit-distance/",topic:"DP (2D)",difficulty:"Medium",section:"Dynamic Programming",so:12},
  {lc:312,name:"Burst Balloons",url:"https://leetcode.com/problems/burst-balloons/",topic:"DP (Interval)",difficulty:"Hard",section:"Dynamic Programming",so:12},
  {lc:309,name:"Best Time to Buy and Sell Stock with Cooldown",url:"https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/",topic:"DP (State Machine)",difficulty:"Medium",section:"Dynamic Programming",so:12},
  {lc:714,name:"Best Time to Buy and Sell Stock with Transaction Fee",url:"https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-transaction-fee/",topic:"DP (State Machine)",difficulty:"Medium",section:"Dynamic Programming",so:12},
  {lc:53,name:"Maximum Subarray",url:"https://leetcode.com/problems/maximum-subarray/",topic:"Greedy (Kadane's)",difficulty:"Medium",section:"Greedy",so:13},
  {lc:55,name:"Jump Game",url:"https://leetcode.com/problems/jump-game/",topic:"Greedy",difficulty:"Medium",section:"Greedy",so:13},
  {lc:45,name:"Jump Game II",url:"https://leetcode.com/problems/jump-game-ii/",topic:"Greedy",difficulty:"Medium",section:"Greedy",so:13},
  {lc:134,name:"Gas Station",url:"https://leetcode.com/problems/gas-station/",topic:"Greedy",difficulty:"Medium",section:"Greedy",so:13},
  {lc:763,name:"Partition Labels",url:"https://leetcode.com/problems/partition-labels/",topic:"Greedy",difficulty:"Medium",section:"Greedy",so:13},
  {lc:678,name:"Valid Parenthesis String",url:"https://leetcode.com/problems/valid-parenthesis-string/",topic:"Greedy",difficulty:"Medium",section:"Greedy",so:13},
  {lc:452,name:"Minimum Number of Arrows to Burst Balloons",url:"https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/",topic:"Greedy & Intervals",difficulty:"Medium",section:"Greedy",so:13},
  {lc:135,name:"Candy",url:"https://leetcode.com/problems/candy/",topic:"Greedy",difficulty:"Hard",section:"Greedy",so:13},
  {lc:136,name:"Single Number",url:"https://leetcode.com/problems/single-number/",topic:"Bit Manipulation",difficulty:"Easy",section:"Bit Manipulation",so:14},
  {lc:191,name:"Number of 1 Bits",url:"https://leetcode.com/problems/number-of-1-bits/",topic:"Bit Manipulation",difficulty:"Easy",section:"Bit Manipulation",so:14},
  {lc:338,name:"Counting Bits",url:"https://leetcode.com/problems/counting-bits/",topic:"Bit Manipulation",difficulty:"Easy",section:"Bit Manipulation",so:14},
  {lc:190,name:"Reverse Bits",url:"https://leetcode.com/problems/reverse-bits/",topic:"Bit Manipulation",difficulty:"Easy",section:"Bit Manipulation",so:14},
  {lc:268,name:"Missing Number",url:"https://leetcode.com/problems/missing-number/",topic:"Bit Manipulation",difficulty:"Easy",section:"Bit Manipulation",so:14},
  {lc:371,name:"Sum of Two Integers",url:"https://leetcode.com/problems/sum-of-two-integers/",topic:"Bit Manipulation",difficulty:"Medium",section:"Bit Manipulation",so:14},
  {lc:48,name:"Rotate Image",url:"https://leetcode.com/problems/rotate-image/",topic:"Math & Matrix",difficulty:"Medium",section:"Math & Geometry",so:15},
  {lc:54,name:"Spiral Matrix",url:"https://leetcode.com/problems/spiral-matrix/",topic:"Math & Matrix",difficulty:"Medium",section:"Math & Geometry",so:15},
  {lc:73,name:"Set Matrix Zeroes",url:"https://leetcode.com/problems/set-matrix-zeroes/",topic:"Math & Matrix",difficulty:"Medium",section:"Math & Geometry",so:15},
  {lc:202,name:"Happy Number",url:"https://leetcode.com/problems/happy-number/",topic:"Math",difficulty:"Easy",section:"Math & Geometry",so:15},
  {lc:66,name:"Plus One",url:"https://leetcode.com/problems/plus-one/",topic:"Math",difficulty:"Easy",section:"Math & Geometry",so:15},
  {lc:149,name:"Max Points on a Line",url:"https://leetcode.com/problems/max-points-on-a-line/",topic:"Math & Geometry",difficulty:"Hard",section:"Math & Geometry",so:15},
  {lc:242,name:"Valid Anagram",url:"https://leetcode.com/problems/valid-anagram/",topic:"Strings",difficulty:"Easy",section:"String Manipulation",so:16},
  {lc:3,name:"Longest Substring Without Repeating Characters",url:"https://leetcode.com/problems/longest-substring-without-repeating-characters/",topic:"Strings",difficulty:"Medium",section:"String Manipulation",so:16},
  {lc:8,name:"String to Integer (atoi)",url:"https://leetcode.com/problems/string-to-integer-atoi/",topic:"Strings",difficulty:"Medium",section:"String Manipulation",so:16},
  {lc:68,name:"Text Justification",url:"https://leetcode.com/problems/text-justification/",topic:"Strings",difficulty:"Hard",section:"String Manipulation",so:16},
  {lc:273,name:"Integer to English Words",url:"https://leetcode.com/problems/integer-to-english-words/",topic:"Strings",difficulty:"Hard",section:"String Manipulation",so:16},
  {lc:341,name:"Flatten Nested List Iterator",url:"https://leetcode.com/problems/flatten-nested-list-iterator/",topic:"Design",difficulty:"Medium",section:"Design / OOD",so:17},
  {lc:1472,name:"Design Browser History",url:"https://leetcode.com/problems/design-browser-history/",topic:"Design",difficulty:"Medium",section:"Design / OOD",so:17},
  {lc:362,name:"Design Hit Counter",url:"https://leetcode.com/problems/design-hit-counter/",topic:"Design",difficulty:"Medium",section:"Design / OOD",so:17},
];

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };

  try {
    const sql = getDb();

    // Create tables if they don't exist
    await initSchema(sql);

    // Find which seed questions are missing from DB
    const allLcNums = SEED.map(q => q.lc);
    const existing = await sql`
      SELECT lc_number FROM questions WHERE lc_number = ANY(${allLcNums}::int[])
    `;
    const existingSet = new Set(existing.map(r => Number(r.lc_number)));
    const missing = SEED.filter(q => !existingSet.has(q.lc));

    // Insert only missing ones — one at a time to avoid bulk insert issues
    for (const q of missing) {
      await sql`
        INSERT INTO questions (lc_number, name, url, topic, difficulty, section, section_order, tags)
        VALUES (${q.lc}, ${q.name}, ${q.url}, ${q.topic}, ${q.difficulty}, ${q.section}, ${q.so}, ${[]})
        ON CONFLICT (lc_number) DO NOTHING
      `;
    }
    if (missing.length > 0) {
      console.log(`[seed] inserted ${missing.length} questions`);
    }

    // Fetch all questions joined with progress
    const rows = await sql`
      SELECT
        q.lc_number,
        q.name,
        q.url,
        q.topic,
        q.difficulty,
        q.section,
        q.section_order,
        q.tags,
        COALESCE(p.is_done, false) AS is_done,
        COALESCE(p.solution, '')   AS solution,
        COALESCE(p.notes, '')      AS notes
      FROM questions q
      LEFT JOIN progress p ON p.lc_number = q.lc_number
      ORDER BY q.section_order ASC, q.lc_number ASC
    `;

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ ok: true, questions: rows }),
    };
  } catch (err) {
    console.error("get-questions ERROR:", err.message);
    console.error(err.stack);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
