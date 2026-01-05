## 需要遵循的规则
- 你也需要遵循全局的规则
- 在typescript项目中禁止使用any
- 当项目strictNullCheck是false的时候，禁止使用（Type || null）或者（Type || underfined）这样的语法
- 在使用react和react时，每个需要接受props的组件都需要定义其props的interface，因为他们都在独立的文件所有叫做Props就可以
- 不允许使用临时类型，所有类型都应该有其清晰的声明
- 本项目强制使用 pnpm 作为包管理器，禁止使用 shamefully-hoist 选项，确保依赖结构的严格性和可预测性