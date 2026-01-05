## 需要遵循的规则
- 在typescript项目中禁止使用any
- 当项目strictNullCheck是false的时候，禁止使用（Type || null）或者（Type || underfined）这样的语法
- 在使用react和react时，每个需要接受props的组件都需要定义其props的interface，因为他们都在独立的文件所有叫做Props就可以
- 不允许使用临时类型，所有类型都应该有其清晰的声明