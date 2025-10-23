/**
 * Local ESLint rule: Ensure DialogContent has an accessible name and description.
 *
 * Checks JSX that imports { DialogContent } from "@/components/ui/dialog" and enforces:
 * - Must have a descendant <DialogTitle> OR have aria-label/aria-labelledby on DialogContent.
 * - Must have a descendant <DialogDescription> OR have aria-describedby on DialogContent.
 */

function getName(node) {
  if (!node) return null
  if (node.type === 'JSXIdentifier') return node.name
  if (node.type === 'JSXMemberExpression') return getName(node.property)
  return null
}

function hasAttr(node, names) {
  const attrs = node.openingElement?.attributes || []
  return attrs.some((a) => a.type === 'JSXAttribute' && a.name && names.includes(a.name.name))
}

function containsDescendant(node, nameSet) {
  const stack = [...(node.children || [])]
  while (stack.length) {
    const n = stack.pop()
    if (!n) continue
    if (n.type === 'JSXElement') {
      const nm = getName(n.openingElement.name)
      if (nm && nameSet.has(nm)) return true
      if (n.children && n.children.length) stack.push(...n.children)
    }
  }
  return false
}

const plugin = {
  rules: {
    'dialog-needs-title-and-description': {
      meta: {
        type: 'problem',
        docs: {
          description: 'DialogContent must include DialogTitle and DialogDescription (or equivalent aria-*).',
        },
        schema: [],
      },
      create(context) {
        const importSource = '@/components/ui/dialog'
        const contentNames = new Set()
        const titleNames = new Set()
        const descNames = new Set()

        return {
          ImportDeclaration(node) {
            const src = node.source && node.source.value
            if (src !== importSource) return
            for (const s of node.specifiers) {
              if (s.type !== 'ImportSpecifier') continue
              const imported = s.imported.name
              const local = s.local.name
              if (imported === 'DialogContent') contentNames.add(local)
              if (imported === 'DialogTitle') titleNames.add(local)
              if (imported === 'DialogDescription') descNames.add(local)
            }
          },
          JSXElement(node) {
            const nm = getName(node.openingElement.name)
            if (!nm || !contentNames.has(nm)) return

            const hasName = hasAttr(node, ['aria-label', 'aria-labelledby']) || containsDescendant(node, titleNames)
            const hasDesc = hasAttr(node, ['aria-describedby']) || containsDescendant(node, descNames)

            if (!hasName) {
              context.report({ node, message: 'DialogContent requires an accessible name: add <DialogTitle> or aria-label/aria-labelledby.' })
            }
            if (!hasDesc) {
              context.report({ node, message: 'DialogContent requires a description: add <DialogDescription> or aria-describedby.' })
            }
          },
        }
      },
    },
  },
}

export default plugin
