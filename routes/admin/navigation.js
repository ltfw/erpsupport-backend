// routes/admin/navigation.js
const express = require('express')
const { PrismaClient, Prisma } = require('../../generated/pwdat')
const router = express.Router()
const prisma = new PrismaClient({ log: ['warn', 'error'] })
const { sql } = Prisma

// 🔐 Middleware: Only allow ADM role
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADM') {
    return res.status(403).json({ error: 'Access denied. Admins only.' })
  }
  next()
}

// 🔹 HELPER: Handle Prisma errors
const handlePrismaError = (err, res) => {
  // console.error('Prisma Error:', err)
  if (err.code === 'P2002') {
    return res.status(400).json({ error: 'Duplicate entry: Key already exists.' })
  }
  return res.status(500).json({ error: 'Database error', details: err.message })
}

// ===================================================================
// 🟦 MENU GROUPS: /admin/navigations/groups
// ===================================================================

// GET all menu groups
router.get('/groups', requireAdmin, async (req, res) => {
  try {
    const groups = await prisma.eRPSupportMenuDefinitions.findMany()
    res.json(groups)
  } catch (err) {
    handlePrismaError(err, res)
  }
})

// GET all roles 
router.get('/roles', requireAdmin, async (req, res) => {
  try {
    const roles = await prisma.userRoles.findMany()
    res.json(roles)
  } catch (err) {
    handlePrismaError(err, res)
  }
})

// POST create or update menu group
router.post('/groups', requireAdmin, async (req, res) => {
  const { MenuKey, DisplayName, IconClass, SortOrder } = req.body

  if (!MenuKey || !DisplayName) {
    return res.status(400).json({ error: 'MenuKey and DisplayName are required' })
  }

  try {
    const group = await prisma.eRPSupportMenuDefinitions.upsert({
      where: { MenuKey },
      update: { DisplayName, IconClass, SortOrder: SortOrder || null },
      create: { MenuKey, DisplayName, IconClass, SortOrder: SortOrder || null }
    })
    res.json(group)
  } catch (err) {
    handlePrismaError(err, res)
  }
})

// DELETE menu group
router.delete('/groups/:key', requireAdmin, async (req, res) => {
  const { key } = req.params

  try {
    await prisma.eRPSupportMenuDefinitions.delete({
      where: { MenuKey: key }
    })
    res.json({ success: true })
  } catch (err) {
    handlePrismaError(err, res)
  }
})

// ===================================================================
// 🟨 MENU ITEMS: /admin/navigations/items
// ===================================================================

// GET all menu items
router.get('/items', requireAdmin, async (req, res) => {
  try {
    const items = await prisma.eRPSupportMenuItems.findMany()
    res.json(items)
  } catch (err) {
    handlePrismaError(err, res)
  }
})

// POST create or update menu item
router.post('/items', requireAdmin, async (req, res) => {
  const { ItemKey, MenuKey, DisplayName, Route, SortOrder } = req.body

  if (!ItemKey || !MenuKey || !DisplayName || !Route) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  try {
    const item = await prisma.eRPSupportMenuItems.upsert({
      where: { ItemKey },
      update: { MenuKey, DisplayName, Route, SortOrder: SortOrder || null },
      create: { ItemKey, MenuKey, DisplayName, Route, SortOrder: SortOrder || null }
    })
    res.json(item)
  } catch (err) {
    handlePrismaError(err, res)
  }
})

// DELETE menu item
router.delete('/items/:key', requireAdmin, async (req, res) => {
  const { key } = req.params

  try {
    await prisma.eRPSupportMenuItems.delete({
      where: { ItemKey: key }
    })
    res.json({ success: true })
  } catch (err) {
    handlePrismaError(err, res)
  }
})

// ===================================================================
// 🟩 ROLE ACCESS: /admin/navigations/access
// ===================================================================

// GET all access rules
router.get('/access', requireAdmin, async (req, res) => {
  try {
    const access = await prisma.eRPSupportRoleMenuAccess.findMany({
      orderBy: { SortOrder: 'asc' }
    })
    res.json(access)
  } catch (err) {
    handlePrismaError(err, res)
  }
})

// POST create or update access rule
router.post('/access', requireAdmin, async (req, res) => {
  const { RoleCode, MenuKey, ItemKey, Environment = 'All', SortOrder } = req.body

  if (!RoleCode || !MenuKey) {
    return res.status(400).json({ error: 'RoleCode and MenuKey are required' })
  }

  const validEnvs = ['All', 'Production', 'Development']
  if (!validEnvs.includes(Environment)) {
    return res.status(400).json({ error: 'Invalid Environment' })
  }

  try {
    // ✅ Use findFirst instead of findUnique
    const existing = await prisma.eRPSupportRoleMenuAccess.findFirst({
      where: {
        RoleCode,
        MenuKey,
        ItemKey: ItemKey || null // ensures null if falsy
      }
    })

    let access
    if (existing) {
      // Update
      access = await prisma.eRPSupportRoleMenuAccess.update({
        where: { Id: existing.Id },
        data: { Environment, SortOrder: SortOrder || null }
      })
    } else {
      // Create
      access = await prisma.eRPSupportRoleMenuAccess.create({
        data: {
          RoleCode,
          MenuKey,
          ItemKey: ItemKey || null,
          Environment,
          SortOrder: SortOrder || null
        }
      })
    }

    res.json(access)
  } catch (err) {
    handlePrismaError(err, res)
  }
})

// DELETE access rule
router.delete('/access/:id', requireAdmin, async (req, res) => {
  const { id } = req.params

  try {
    await prisma.eRPSupportRoleMenuAccess.delete({
      where: { Id: parseInt(id) }
    })
    res.json({ success: true })
  } catch (err) {
    handlePrismaError(err, res)
  }
})

module.exports = router