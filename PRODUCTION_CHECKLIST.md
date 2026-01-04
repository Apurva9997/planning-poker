# Production Launch Checklist

## Pre-Deployment Checklist

### Database Setup ✅
- [ ] Create Neon PostgreSQL project
- [ ] Copy connection string
- [ ] Verify SSL mode is enabled (`sslmode=require`)
- [ ] Test database connection locally
- [ ] Verify `kv_store` table is created automatically (on first function call)

### Environment Variables ✅
- [ ] Set `DATABASE_URL` in Netlify environment variables
- [ ] Verify `.env` file is not committed to git
- [ ] Test with environment variables locally

### Netlify Configuration ✅
- [ ] Verify `netlify.toml` is configured correctly
- [ ] Build command: `npm run build`
- [ ] Publish directory: `dist`
- [ ] Node version: 18
- [ ] Functions directory configured

### Security Review ✅
- [ ] All hardcoded credentials removed
- [ ] Environment variables set
- [ ] Input validation implemented
- [ ] CORS configured (consider restricting origins)
- [ ] Security headers configured
- [ ] SQL injection prevention verified

### Functionality Testing ✅
- [ ] Create room works
- [ ] Join room works
- [ ] Submit vote works
- [ ] Reveal votes works
- [ ] Reset round works
- [ ] Leave room works
- [ ] Realtime polling works (2-second intervals)
- [ ] Room code generation is unique
- [ ] Player limit (50) enforced
- [ ] Input validation works (invalid inputs rejected)

### Performance Testing ✅
- [ ] Function response times acceptable (< 1s)
- [ ] Database queries optimized
- [ ] No memory leaks in polling
- [ ] Concurrent users handled (test with multiple tabs)

### Error Handling ✅
- [ ] Network errors handled gracefully
- [ ] Database errors don't expose sensitive info
- [ ] Invalid room codes handled
- [ ] Missing players handled
- [ ] Function timeouts handled

### Browser Compatibility ✅
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

### Documentation ✅
- [ ] README.md updated
- [ ] DEPLOYMENT.md created
- [ ] SECURITY.md created
- [ ] Environment variables documented

## Deployment Steps

1. **Build Locally** (optional, to verify):
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**:
   - Via Git: Push to main branch (auto-deploy)
   - Via CLI: `netlify deploy --prod`
   - Via Dashboard: Import project and deploy

3. **Set Environment Variables in Netlify**:
   - Go to Site settings → Environment variables
   - Add `DATABASE_URL` with your Neon connection string

4. **Verify Deployment**:
   - Check function logs in Netlify dashboard
   - Test all endpoints
   - Verify realtime updates work

5. **Monitor**:
   - Check function execution times
   - Monitor database connections
   - Watch for errors in logs

## Post-Deployment Verification

### Functionality ✅
- [ ] Site loads correctly
- [ ] Can create a room
- [ ] Can join a room
- [ ] Can vote
- [ ] Can reveal votes
- [ ] Can reset round
- [ ] Can leave room
- [ ] Realtime updates work (polling every 2s)

### Performance ✅
- [ ] Page load time < 3s
- [ ] Function response time < 1s
- [ ] No console errors
- [ ] No network errors

### Security ✅
- [ ] HTTPS enforced
- [ ] Security headers present (check in browser dev tools)
- [ ] No sensitive data in client code
- [ ] CORS headers correct

### Monitoring ✅
- [ ] Set up error alerts (optional)
- [ ] Monitor function logs
- [ ] Monitor database usage
- [ ] Check for unusual activity

## Realtime Features Verification

The app uses **polling** (not WebSockets) for realtime updates:

✅ **How it works:**
- Polls `/room/:code` endpoint every 2 seconds
- Updates UI when room data changes
- Works with Neon PostgreSQL (no special configuration needed)

✅ **Testing:**
1. Open app in two browser windows
2. Create/join same room in both
3. Vote in one window
4. Verify vote appears in other window within 2 seconds
5. Verify reveal works in both windows
6. Verify reset works in both windows

✅ **Performance:**
- Polling every 2s is acceptable for this use case
- Neon PostgreSQL handles concurrent reads well
- No WebSocket infrastructure needed

## Known Limitations

1. **Polling Interval**: 2 seconds (not true realtime, but acceptable)
2. **No Authentication**: Anyone with room code can join
3. **Room Persistence**: Rooms persist until manually deleted
4. **CORS**: Currently allows all origins (should restrict in production)

## Rollback Plan

If issues occur:

1. **Immediate**: Revert to previous deployment in Netlify dashboard
2. **Database**: Neon has point-in-time recovery (if needed)
3. **Environment**: Keep previous environment variable values

## Support Resources

- **Netlify Docs**: https://docs.netlify.com
- **Neon Docs**: https://neon.tech/docs
- **Function Logs**: Netlify Dashboard → Functions → Logs
- **Database Logs**: Neon Dashboard → Logs

## Success Criteria

✅ All checklist items completed
✅ Site deployed and accessible
✅ All features working
✅ No critical errors
✅ Performance acceptable
✅ Security measures in place

---

**Ready for Production**: ✅ / ❌

**Deployed Date**: ___________

**Deployed By**: ___________

**Notes**: ___________

