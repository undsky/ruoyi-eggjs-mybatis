# ruoyi-eggjs-mybatis

> Egg plugin for mybatis

MyBatis 风格的 SQL 映射插件，支持使用 XML 文件编写动态 SQL，让 Node.js 开发者也能享受 MyBatis 的便利。

## 特性

- ✅ 使用 XML 文件编写 SQL，业务逻辑与 SQL 分离
- ✅ 支持 MyBatis 动态 SQL 标签（if、choose、where、set、foreach 等）
- ✅ 参数化查询，自动防 SQL 注入（`#{}` 和 `${}`）
- ✅ 支持多数据库类型（MySQL、SQLite 等）
- ✅ 支持多数据源配置
- ✅ 内置分页辅助方法
- ✅ 生产环境预加载，开发环境热更新
- ✅ 支持 SQL 片段复用（`<include>`）

## 安装

```bash
$ npm i ruoyi-eggjs-mybatis --save
```

## 支持的 egg 版本

| egg 3.x | egg 2.x | egg 1.x |
| ------- | ------- | ------- |
| 😁      | 😁      | ❌      |

## 开启插件

```js
// {app_root}/config/plugin.js
exports.mybatis = {
  enable: true,
  package: "ruoyi-eggjs-mybatis",
};
```

## 配置

```js
// {app_root}/config/config.default.js
const path = require('path');

config.mybatis = {
  mapperPath: path.join(appInfo.baseDir, 'mapper'),  // Mapper XML 文件目录
  defaultPageSize: 10,        // 默认分页条数
  pageOffset: 1,              // 分页偏移量（从 1 开始）
  currentPageName: 'currentPage',  // 当前页参数名
  pageSizeName: 'pageSize',   // 每页条数参数名
};
```

## 目录结构

插件支持灵活的目录结构，适应不同的项目需求。

### 单数据库（默认 MySQL）

```bash
./mapper/
  └── 数据库名/
      ├── 表名1.xml
      ├── 表名2.xml
      └── ...
```

示例：
```bash
./mapper/
  └── ruoyi/
      ├── SysUserMapper.xml
      ├── SysRoleMapper.xml
      └── SysMenuMapper.xml
```

### 多数据库类型

```bash
./mapper/
  ├── mysql/
  │   └── 数据库名/
  │       ├── 表名1.xml
  │       └── 表名2.xml
  └── sqlite/
      └── 数据库名/
          ├── 表名1.xml
          └── 表名2.xml
```

示例：
```bash
./mapper/
  ├── mysql/
  │   └── ruoyi/
  │       ├── SysUserMapper.xml
  │       └── SysRoleMapper.xml
  └── sqlite/
      └── local/
          └── CacheMapper.xml
```

## XML 映射文件

### 基础结构

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="mapper/mysql/ruoyi/SysUserMapper.xml">
    
    <!-- 查询语句 -->
    <select id="selectUserById">
        SELECT * FROM sys_user WHERE user_id = ?
    </select>
    
</mapper>
```

### namespace 命名规则

namespace 使用 Mapper XML 文件的**相对路径**（从项目根目录开始），包含 `.xml` 扩展名：

```xml
<!-- 正确 ✅ -->
<mapper namespace="mapper/mysql/ruoyi/SysUserMapper.xml">

<!-- 错误 ❌ -->
<mapper namespace="SysUserMapper">
```

## 使用方法

### 基础用法

```js
// 在 controller 或 service 中使用
const { app, ctx } = this;

/**
 * @param {String} namespace - XML 文件的 namespace
 * @param {String} sqlid - SQL 语句的 id
 * @param {Array} values - ? 占位符参数数组（可选）
 * @param {Object} params - 动态 SQL 参数对象（可选）
 * @return {String} 生成的 SQL 语句
 */
const sql = app.mapper(namespace, sqlid, values, params);
```

### 简单查询

```xml
<!-- mapper/mysql/ruoyi/SysUserMapper.xml -->
<mapper namespace="mapper/mysql/ruoyi/SysUserMapper.xml">
    <select id="selectUserById">
        SELECT user_id, user_name, email FROM sys_user WHERE user_id = ?
    </select>
</mapper>
```

```js
// 使用
const userId = 1;
const sql = app.mapper(
  'mapper/mysql/ruoyi/SysUserMapper.xml',
  'selectUserById',
  [userId]
);
const user = await app.mysql.select(sql);
```

### 动态 SQL - if 标签

```xml
<select id="selectUserList">
    SELECT * FROM sys_user
    WHERE 1=1
    <if test="userName">
        AND user_name LIKE '%${userName}%'
    </if>
    <if test="status">
        AND status = #{status}
    </if>
</select>
```

```js
const sql = app.mapper(
  'mapper/mysql/ruoyi/SysUserMapper.xml',
  'selectUserList',
  [],
  { userName: '张三', status: '0' }
);
const users = await app.mysql.selects(sql);
```

### 动态 SQL - where 标签

自动处理 WHERE 关键字和首个 AND/OR。

```xml
<select id="selectUserList">
    SELECT * FROM sys_user
    <where>
        <if test="userName">
            AND user_name LIKE '%${userName}%'
        </if>
        <if test="email">
            AND email = #{email}
        </if>
        <if test="status">
            AND status = #{status}
        </if>
    </where>
</select>
```

### 动态 SQL - set 标签

用于 UPDATE 语句，自动处理逗号。

```xml
<update id="updateUser">
    UPDATE sys_user
    <set>
        <if test="userName">
            user_name = #{userName},
        </if>
        <if test="email">
            email = #{email},
        </if>
        <if test="phonenumber">
            phonenumber = #{phonenumber},
        </if>
        update_time = NOW()
    </set>
    WHERE user_id = ?
</update>
```

```js
const sql = app.mapper(
  'mapper/mysql/ruoyi/SysUserMapper.xml',
  'updateUser',
  [userId],
  { userName: '新名字', email: 'new@example.com' }
);
await app.mysql.update(sql);
```

### 动态 SQL - foreach 标签

用于 IN 查询或批量操作。

```xml
<delete id="deleteUserByIds">
    DELETE FROM sys_user WHERE user_id IN
    <foreach collection="array" item="userId" open="(" separator="," close=")">
        #{userId}
    </foreach>
</delete>
```

```js
const sql = app.mapper(
  'mapper/mysql/ruoyi/SysUserMapper.xml',
  'deleteUserByIds',
  [],
  { array: [1, 2, 3, 4, 5] }
);
await app.mysql.run(sql);
```

### 动态 SQL - choose/when/otherwise

类似 switch-case 语句。

```xml
<select id="selectUserByCondition">
    SELECT * FROM sys_user
    WHERE 1=1
    <choose>
        <when test="userId">
            AND user_id = #{userId}
        </when>
        <when test="userName">
            AND user_name = #{userName}
        </when>
        <otherwise>
            AND status = '0'
        </otherwise>
    </choose>
</select>
```

### SQL 片段复用 - include

```xml
<mapper namespace="mapper/mysql/ruoyi/SysUserMapper.xml">
    
    <!-- 定义可复用的 SQL 片段 -->
    <sql id="selectUserVo">
        SELECT user_id, user_name, nick_name, email, phonenumber, sex, 
               avatar, password, status, create_time
        FROM sys_user
    </sql>
    
    <!-- 使用 SQL 片段 -->
    <select id="selectUserById">
        <include refid="selectUserVo"/>
        WHERE user_id = ?
    </select>
    
    <select id="selectUserList">
        <include refid="selectUserVo"/>
        <where>
            <if test="userName">
                AND user_name LIKE '%${userName}%'
            </if>
        </where>
    </select>
    
</mapper>
```

## 参数占位符

### #{} - 预编译参数（推荐）

使用 `#{}` 会进行参数转义，防止 SQL 注入，相当于 JDBC 的 `?`。

```xml
<select id="selectUser">
    SELECT * FROM sys_user WHERE user_name = #{userName}
</select>
```

生成的 SQL：
```sql
SELECT * FROM sys_user WHERE user_name = 'admin'
```

### ${} - 直接替换

使用 `${}` 会直接进行字符串替换，**不会转义，存在 SQL 注入风险**，仅用于表名、字段名等。

```xml
<select id="selectByColumn">
    SELECT * FROM sys_user ORDER BY ${orderColumn} ${orderType}
</select>
```

```js
const sql = app.mapper(
  'namespace',
  'selectByColumn',
  [],
  { orderColumn: 'create_time', orderType: 'DESC' }
);
```

⚠️ **注意**：`${}` 不安全，尽量使用 `#{}`。

## 分页查询

插件提供了便捷的分页方法 `ctx.helper.page()`。

### 基础用法

```js
// controller
async list() {
  const { ctx, app } = this;
  const params = ctx.request.body;
  
  // 生成查询 SQL
  const sql = app.mapper(
    'mapper/mysql/ruoyi/SysUserMapper.xml',
    'selectUserList',
    ctx.helper.page(params),  // 自动注入分页参数
    params
  );
  
  const list = await app.mysql.selects(sql);
  ctx.body = { list };
}
```

### 分页参数说明

默认从请求的 `body` 或 `query` 中读取分页参数：

- `currentPage`：当前页码（默认 1）
- `pageSize`：每页条数（默认 10）

```js
// 请求示例
POST /api/user/list
{
  "currentPage": 2,
  "pageSize": 20,
  "userName": "张三"
}
```

### 手动指定分页

```js
// 指定第 3 页，每页 15 条
const pageParams = ctx.helper.page(params, 3, 15);

// 或者传入其他查询参数
const pageParams = ctx.helper.page([userId, status], 2, 20);
```

### XML 中使用分页

```xml
<select id="selectUserList">
    SELECT * FROM sys_user
    <where>
        <if test="userName">
            AND user_name LIKE '%${userName}%'
        </if>
    </where>
    ORDER BY create_time DESC
    LIMIT ?, ?
</select>
```

`ctx.helper.page()` 会自动计算并注入 `LIMIT offset, size` 的两个参数。

## 完整示例

### Mapper XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="mapper/mysql/ruoyi/SysUserMapper.xml">

    <sql id="selectUserVo">
        SELECT user_id, user_name, nick_name, email, phonenumber, sex, 
               avatar, status, create_time, remark
        FROM sys_user
    </sql>

    <select id="selectUserList">
        <include refid="selectUserVo"/>
        <where>
            <if test="userId">
                AND user_id = #{userId}
            </if>
            <if test="userName">
                AND user_name LIKE CONCAT('%', #{userName}, '%')
            </if>
            <if test="phonenumber">
                AND phonenumber LIKE CONCAT('%', #{phonenumber}, '%')
            </if>
            <if test="status">
                AND status = #{status}
            </if>
            <if test="params.beginTime">
                AND create_time &gt;= #{params.beginTime}
            </if>
            <if test="params.endTime">
                AND create_time &lt;= #{params.endTime}
            </if>
        </where>
        ORDER BY create_time DESC
        LIMIT ?, ?
    </select>

    <select id="selectUserById">
        <include refid="selectUserVo"/>
        WHERE user_id = ?
    </select>

    <insert id="insertUser">
        INSERT INTO sys_user(
            <if test="userId">user_id,</if>
            <if test="userName">user_name,</if>
            <if test="nickName">nick_name,</if>
            <if test="email">email,</if>
            <if test="phonenumber">phonenumber,</if>
            <if test="sex">sex,</if>
            <if test="password">password,</if>
            <if test="status">status,</if>
            <if test="remark">remark,</if>
            create_time
        ) VALUES (
            <if test="userId">#{userId},</if>
            <if test="userName">#{userName},</if>
            <if test="nickName">#{nickName},</if>
            <if test="email">#{email},</if>
            <if test="phonenumber">#{phonenumber},</if>
            <if test="sex">#{sex},</if>
            <if test="password">#{password},</if>
            <if test="status">#{status},</if>
            <if test="remark">#{remark},</if>
            NOW()
        )
    </insert>

    <update id="updateUser">
        UPDATE sys_user
        <set>
            <if test="userName">user_name = #{userName},</if>
            <if test="nickName">nick_name = #{nickName},</if>
            <if test="email">email = #{email},</if>
            <if test="phonenumber">phonenumber = #{phonenumber},</if>
            <if test="sex">sex = #{sex},</if>
            <if test="status">status = #{status},</if>
            <if test="remark">remark = #{remark},</if>
            update_time = NOW()
        </set>
        WHERE user_id = ?
    </update>

    <delete id="deleteUserById">
        DELETE FROM sys_user WHERE user_id = ?
    </delete>

    <delete id="deleteUserByIds">
        DELETE FROM sys_user WHERE user_id IN
        <foreach collection="array" item="userId" open="(" separator="," close=")">
            #{userId}
        </foreach>
    </delete>

</mapper>
```

### Service 层

```js
// app/service/user.js
const { Service } = require('egg');

class UserService extends Service {
  
  async selectUserList(params) {
    const { app, ctx } = this;
    const sql = app.mapper(
      'mapper/mysql/ruoyi/SysUserMapper.xml',
      'selectUserList',
      ctx.helper.page(params),
      params
    );
    return await app.mysql.selects(sql);
  }

  async selectUserById(userId) {
    const { app } = this;
    const sql = app.mapper(
      'mapper/mysql/ruoyi/SysUserMapper.xml',
      'selectUserById',
      [userId]
    );
    return await app.mysql.select(sql);
  }

  async insertUser(user) {
    const { app } = this;
    const sql = app.mapper(
      'mapper/mysql/ruoyi/SysUserMapper.xml',
      'insertUser',
      [],
      user
    );
    return await app.mysql.insert(sql);
  }

  async updateUser(user) {
    const { app } = this;
    const sql = app.mapper(
      'mapper/mysql/ruoyi/SysUserMapper.xml',
      'updateUser',
      [user.userId],
      user
    );
    return await app.mysql.update(sql);
  }

  async deleteUser(userId) {
    const { app } = this;
    const sql = app.mapper(
      'mapper/mysql/ruoyi/SysUserMapper.xml',
      'deleteUserById',
      [userId]
    );
    return await app.mysql.del(sql);
  }

  async deleteUserByIds(userIds) {
    const { app } = this;
    const sql = app.mapper(
      'mapper/mysql/ruoyi/SysUserMapper.xml',
      'deleteUserByIds',
      [],
      { array: userIds }
    );
    return await app.mysql.run(sql);
  }
}

module.exports = UserService;
```

### Controller 层

```js
// app/controller/user.js
const { Controller } = require('egg');

class UserController extends Controller {
  
  async list() {
    const { ctx } = this;
    const users = await ctx.service.user.selectUserList(ctx.request.body);
    ctx.body = {
      code: 200,
      data: users,
    };
  }

  async info() {
    const { ctx } = this;
    const { userId } = ctx.params;
    const user = await ctx.service.user.selectUserById(userId);
    ctx.body = {
      code: 200,
      data: user,
    };
  }

  async add() {
    const { ctx } = this;
    const insertId = await ctx.service.user.insertUser(ctx.request.body);
    ctx.body = {
      code: 200,
      data: insertId,
    };
  }

  async update() {
    const { ctx } = this;
    const rows = await ctx.service.user.updateUser(ctx.request.body);
    ctx.body = {
      code: 200,
      data: rows,
    };
  }

  async remove() {
    const { ctx } = this;
    const { userIds } = ctx.request.body;
    await ctx.service.user.deleteUserByIds(userIds);
    ctx.body = {
      code: 200,
      message: '删除成功',
    };
  }
}

module.exports = UserController;
```

## 支持的 MyBatis 标签

| 标签 | 说明 | 示例 |
| --- | --- | --- |
| `<if>` | 条件判断 | `<if test="userName">...</if>` |
| `<choose>` | 多条件选择（类似 switch） | `<choose><when>...</when><otherwise>...</otherwise></choose>` |
| `<when>` | choose 的分支 | `<when test="condition">...</when>` |
| `<otherwise>` | choose 的默认分支 | `<otherwise>...</otherwise>` |
| `<where>` | 智能 WHERE 子句 | `<where><if>...</if></where>` |
| `<set>` | 智能 SET 子句（UPDATE） | `<set><if>...</if></set>` |
| `<foreach>` | 循环遍历（IN 查询） | `<foreach collection="array" item="id">...</foreach>` |
| `<trim>` | 字符串裁剪 | `<trim prefix="WHERE" prefixOverrides="AND">...</trim>` |
| `<bind>` | 变量绑定 | `<bind name="pattern" value="'%' + userName + '%'"/>` |
| `<sql>` | SQL 片段定义 | `<sql id="columns">...</sql>` |
| `<include>` | 引用 SQL 片段 | `<include refid="columns"/>` |

## 工作原理

### 开发环境（local）

- 每次调用 `app.mapper()` 时动态加载 XML 文件
- 支持热更新，修改 XML 后无需重启
- 适合开发调试

### 生产环境（prod）

- 应用启动时预加载所有 XML 文件到内存
- 使用缓存，避免重复解析
- 性能更优

## 注意事项

1. **namespace 必须是完整路径**：包含 `.xml` 扩展名，如 `mapper/mysql/ruoyi/SysUserMapper.xml`

2. **参数安全性**：
   - 优先使用 `#{}` 进行参数绑定，自动转义
   - 谨慎使用 `${}`，仅用于表名、字段名等不可参数化的部分

3. **CDATA 区块**：包含特殊字符（`<`、`>`、`&`）的 SQL 建议使用 CDATA：
   ```xml
   <select id="selectUser">
       <![CDATA[
           SELECT * FROM sys_user WHERE age >= 18 AND status = '0'
       ]]>
   </select>
   ```

4. **XML 格式要求**：
   - 必须包含 XML 声明和 DOCTYPE
   - 标签必须正确闭合
   - 属性值必须用引号包裹

5. **多数据库兼容**：不同数据库的 SQL 语法可能不同，注意区分 Mapper 文件

## 常见问题

### 1. 如何调试生成的 SQL？

在非生产环境下，插件会打印 SQL 执行时间。可以在调用后打印 SQL：

```js
const sql = app.mapper('namespace', 'sqlid', [id], params);
console.log('Generated SQL:', sql);
const result = await app.mysql.select(sql);
```

### 2. 如何处理复杂的嵌套查询？

使用 `<sql>` 和 `<include>` 拆分 SQL 片段，提高可维护性。

### 3. 分页参数如何传递？

使用 `ctx.helper.page()` 会自动计算 LIMIT 参数并追加到参数数组末尾。

### 4. 如何实现动态表名？

使用 `${}` 直接替换（注意安全性）：

```xml
<select id="selectFromTable">
    SELECT * FROM ${tableName} WHERE id = #{id}
</select>
```

## 相关链接

- [MyBatis 官方文档](https://mybatis.org/mybatis-3/zh/index.html)
- [MyBatis 动态 SQL](https://mybatis.org/mybatis-3/zh/dynamic-sql.html)
- [html-parse-stringify](https://github.com/henrikjoreteg/html-parse-stringify)
- [sqlstring](https://github.com/mysqljs/sqlstring)

## License

[MIT](LICENSE)
