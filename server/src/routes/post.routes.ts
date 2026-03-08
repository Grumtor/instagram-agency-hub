import { Router } from 'express';
import * as postController from '../controllers/post.controller';
import { requireAuth } from '../middleware/auth';
import { requireWorkspaceAccess } from '../middleware/workspaceAccess';
import { validate } from '../middleware/validate';
import { handleUpload } from '../middleware/upload';
import { createPostSchema, updatePostSchema } from '../validators/post.validator';

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.use(requireWorkspaceAccess());

router.get('/', postController.getPosts);
router.post('/', validate(createPostSchema), postController.createPost);
router.post('/upload-media', handleUpload('files', 10), postController.uploadMedia);
router.get('/:postId', postController.getPostById);
router.patch('/:postId', validate(updatePostSchema), postController.updatePost);
router.delete('/:postId', postController.deletePost);
router.post('/:postId/publish', postController.publishNow);

export default router;
