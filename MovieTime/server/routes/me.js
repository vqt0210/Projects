import express from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const userId = req.auth.userId; // Clerk middleware phải được sử dụng
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await clerkClient.users.getUser(userId);

    res.json({
      id: user.id,
      name: user.firstName || user.username,
      email: user.emailAddresses[0]?.emailAddress,
      image: user.imageUrl,
      role: user.privateMetadata?.role || 'user', // lấy role từ privateMetadata
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
