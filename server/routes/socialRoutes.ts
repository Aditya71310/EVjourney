import { Router } from 'express';
import { optionalAuth, requireAuth, type AuthRequest } from '../middleware/auth.ts';
import {
  addJourneyComment,
  findDiscoverJourneys,
  findEventsByJourney,
  findJourneyById,
  findJourneysByUser,
  findUserById,
  findUserByUsername,
  findVehicleById,
  getFollowerIds,
  getFollowingIds,
  getJourneyComments,
  getJourneySocialStats,
  getSavedJourneysByUser,
  isFollowingUser,
  searchAll,
  toggleCommentLike,
  toggleFollow,
  toggleJourneyLike,
  toggleJourneySave,
} from '../services/dataService.ts';

const router = Router();

async function enrichFeedJourneys(journeys: any[], viewerId?: string) {
  return Promise.all(
    journeys.map(async (j) => {
      const [vehicle, author, events, social] = await Promise.all([
        findVehicleById(j.vehicleId),
        findUserById(j.userId),
        findEventsByJourney(j._id),
        getJourneySocialStats(j._id, viewerId),
      ]);
      const chargingStops = events.filter((e) => e.type === 'Charging stop');
      const totalEnergyKwh = chargingStops.reduce(
        (acc, e) => acc + (e.chargingDetail?.energyKwh || 0),
        0
      );
      return {
        ...j,
        vehicle,
        author: author
          ? {
              _id: author._id,
              name: author.name,
              username: author.username,
              avatar: author.avatar,
              coverScene: author.coverScene,
            }
          : null,
        eventCount: events.length,
        chargingStopsCount: chargingStops.length,
        totalEnergyKwh: Number(totalEnergyKwh.toFixed(1)),
        ...social,
      };
    })
  );
}

router.get('/discover', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const tabParam = String(req.query.tab || 'trending');
    const tab =
      tabParam === 'latest' || tabParam === 'following' ? tabParam : 'trending';
    const raw = await findDiscoverJourneys(req.userId, tab);
    const journeys = await enrichFeedJourneys(raw, req.userId);
    return res.json({ journeys });
  } catch (err) {
    console.error('[Discover]', err);
    return res.status(500).json({ message: 'Failed to load discover feed.' });
  }
});

router.post('/journeys/:id/like', requireAuth, async (req: AuthRequest, res) => {
  try {
    const journey = await findJourneyById(req.params.id);
    if (!journey) return res.status(404).json({ message: 'Journey not found.' });
    const result = await toggleJourneyLike(journey._id, req.userId!);
    return res.json(result);
  } catch (err) {
    console.error('[Journey Like]', err);
    return res.status(500).json({ message: 'Unable to update like.' });
  }
});

router.post('/journeys/:id/save', requireAuth, async (req: AuthRequest, res) => {
  try {
    const journey = await findJourneyById(req.params.id);
    if (!journey) return res.status(404).json({ message: 'Journey not found.' });
    const isSaved = await toggleJourneySave(journey._id, req.userId!);
    return res.json({ isSaved });
  } catch (err) {
    console.error('[Journey Save]', err);
    return res.status(500).json({ message: 'Unable to save journey.' });
  }
});

router.get('/journeys/:id/comments', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const comments = await getJourneyComments(req.params.id, req.userId);
    return res.json({ comments });
  } catch (err) {
    console.error('[Comments List]', err);
    return res.status(500).json({ message: 'Failed to load comments.' });
  }
});

router.post('/journeys/:id/comments', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { text, parentId } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }
    const created = await addJourneyComment(
      req.params.id,
      req.userId!,
      String(text),
      parentId || null
    );
    const comments = await getJourneyComments(req.params.id, req.userId);
    return res.status(201).json({ comment: created, comments });
  } catch (err) {
    console.error('[Comment Create]', err);
    return res.status(500).json({ message: 'Failed to post comment.' });
  }
});

router.post('/comments/:id/like', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await toggleCommentLike(req.params.id, req.userId!);
    return res.json(result);
  } catch (err) {
    console.error('[Comment Like]', err);
    return res.status(500).json({ message: 'Failed to toggle comment like.' });
  }
});

router.get('/users/u/:handle', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const target = await findUserByUsername(req.params.handle);
    if (!target) return res.status(404).json({ message: 'User not found.' });

    const [followerIds, followingIds, rawJourneys, savedRaw, isFollowing] =
      await Promise.all([
        getFollowerIds(target._id),
        getFollowingIds(target._id),
        findJourneysByUser(target._id),
        getSavedJourneysByUser(target._id),
        req.userId ? isFollowingUser(req.userId, target._id) : Promise.resolve(false),
      ]);

    const viewerFollowsTarget = isFollowing;
    const isSelf = req.userId === target._id;
    const visibleJourneys = rawJourneys.filter((j) => {
      if (isSelf) return true;
      if (j.status !== 'Published') return false;
      if (j.visibility === 'Public') return true;
      if (j.visibility === 'Followers' && viewerFollowsTarget) return true;
      return false;
    });

    const [journeys, savedJourneys] = await Promise.all([
      enrichFeedJourneys(visibleJourneys, req.userId),
      enrichFeedJourneys(
        savedRaw.filter((j) => j.visibility === 'Public' || j.userId === req.userId),
        req.userId
      ),
    ]);

    return res.json({
      profile: {
        _id: target._id,
        name: target.name,
        username: target.username,
        avatar: target.avatar,
        bio: target.bio,
        city: target.city,
        country: target.country,
        coverScene: target.coverScene || 'sunset',
        createdAt: target.createdAt,
      },
      stats: {
        followersCount: followerIds.length,
        followingCount: followingIds.length,
        journeysCount: journeys.length,
      },
      isFollowing,
      isSelf,
      journeys,
      savedJourneys,
    });
  } catch (err) {
    console.error('[Public Profile]', err);
    return res.status(500).json({ message: 'Failed to load profile.' });
  }
});

router.post('/users/:id/follow', requireAuth, async (req: AuthRequest, res) => {
  try {
    const target = await findUserById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found.' });
    const isFollowing = await toggleFollow(req.userId!, target._id);
    const followerIds = await getFollowerIds(target._id);
    return res.json({ isFollowing, followersCount: followerIds.length });
  } catch (err) {
    console.error('[Follow Toggle]', err);
    return res.status(500).json({ message: 'Failed to update follow status.' });
  }
});

router.get(
  '/users/u/:handle/connections',
  optionalAuth,
  async (req: AuthRequest, res) => {
    try {
      const target = await findUserByUsername(req.params.handle);
      if (!target) return res.status(404).json({ message: 'User not found.' });

      const [followerIds, followingIds, viewerFollowingIds] = await Promise.all([
        getFollowerIds(target._id),
        getFollowingIds(target._id),
        req.userId ? getFollowingIds(req.userId) : Promise.resolve([]),
      ]);
      const viewerFollowerIds = req.userId ? await getFollowerIds(req.userId) : [];

      const mapIds = async (ids: string[]) => {
        const users = await Promise.all(ids.map((uid) => findUserById(uid)));
        return users
          .filter((u): u is NonNullable<typeof u> => Boolean(u))
          .map((u) => ({
            _id: u._id,
            name: u.name,
            username: u.username,
            bio: u.bio,
            avatar: u.avatar,
            city: u.city,
            country: u.country,
            isFollowing: viewerFollowingIds.includes(u._id),
            followsYou: viewerFollowerIds.includes(u._id),
          }));
      };

      const [followers, following] = await Promise.all([
        mapIds(followerIds),
        mapIds(followingIds),
      ]);

      return res.json({
        profile: {
          _id: target._id,
          name: target.name,
          username: target.username,
        },
        followers,
        following,
      });
    } catch (err) {
      console.error('[Connections]', err);
      return res.status(500).json({ message: 'Failed to load connections.' });
    }
  }
);

router.get('/search', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const q = String(req.query.q || '');
    const results = await searchAll(q);
    const viewerFollowingIds = req.userId ? await getFollowingIds(req.userId) : [];

    const enrichedJourneys = await enrichFeedJourneys(results.journeys, req.userId);
    const users = results.users.map((u) => ({
      _id: u._id,
      name: u.name,
      username: u.username,
      bio: u.bio,
      avatar: u.avatar,
      city: u.city,
      country: u.country,
      isFollowing: viewerFollowingIds.includes(u._id),
      followsYou: false,
    }));

    return res.json({
      users,
      journeys: enrichedJourneys,
      vehicles: results.vehicles,
    });
  } catch (err) {
    console.error('[Search]', err);
    return res.status(500).json({ message: 'Search failed.' });
  }
});

export default router;
