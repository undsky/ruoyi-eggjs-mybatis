var fs = require('fs');
var HTML = require('html-parse-stringify');
var convert = require('./lib/convert');
var myBatisMapper = {};

function MybatisMapper() {

}

MybatisMapper.prototype.createMapper = function (xmls) {
  // Parse each XML files
  for (var i = 0, xml; xml = xmls[i]; i++) {
    try {
      var rawText = replaceCdata(fs.readFileSync(xml).toString());
      var mappers = HTML.parse(rawText);
    } catch (err) {
      throw new Error("Error occured during open XML file [" + xml + "]");
    }

    try {
      for (var j = 0, mapper; mapper = mappers[j]; j++) {
        // Mapping <mapper> tag recursively
        findMapper(mapper);
      }
    } catch (err) {
      throw new Error("Error occured during parse XML file [" + xml + "]");
    }
  }
};

const queryTypes = ['sql', 'select', 'selects', 'insert', 'update', 'delete', 'ref'];
findMapper = function (children) {
  if (children.type == 'tag' && children.name == 'mapper') {
    // Add Mapper
    if(!myBatisMapper[children.attrs.namespace]) {
      myBatisMapper[children.attrs.namespace] = {};
    }

    for (var j = 0, sql; sql = children.children[j]; j++) {
      if (sql['type'] == 'tag' && queryTypes.indexOf(sql['name']) > -1) {
        myBatisMapper[children.attrs.namespace][sql.attrs.id] = sql.children;
      }
    }
    return;
  } else {
    // Recursive to next children
    if (children['children'] != null && children['children'].length > 0) {
      for (var j = 0, nextChildren; nextChildren = children.children[j]; j++) {
        findMapper(nextChildren);
      }
    } else {
      return;
    }
  }
}

replaceCdata = function (rawText) {
  // 先移除 XML 注释，避免影响解析
  rawText = rawText.replace(/<!--[\s\S]*?-->/g, '');
  
  var cdataRegex = new RegExp('(<!\\[CDATA\\[)([\\s\\S]*?)(\\]\\]>)', 'g');
  var matches = rawText.match(cdataRegex);

  if (matches != null && matches.length > 0) {
    for (var z = 0; z < matches.length; z++) {
      var regex = new RegExp('(<!\\[CDATA\\[)([\\s\\S]*?)(\\]\\]>)', 'g');
      var m = regex.exec(matches[z]);

      var cdataText = m[2];
      cdataText = cdataText.replace(/\&/g, '&amp;');
      cdataText = cdataText.replace(/\</g, '&lt;');
      cdataText = cdataText.replace(/\>/g, '&gt;');
      cdataText = cdataText.replace(/\"/g, '&quot;');

      rawText = rawText.replace(m[0], cdataText);
    }
  }

  return rawText;
}

MybatisMapper.prototype.getStatement = function (namespace, sql, param) {
  var statement = '';
  

  // Parameter Check
  if (namespace == null) throw new Error('Namespace should not be null.');
  if (myBatisMapper[namespace] == undefined) throw new Error('Namespace [' + namespace + '] not exists.');
  if (sql == null) throw new Error('SQL ID should not be null.');
  if (myBatisMapper[namespace][sql] == undefined) throw new Error('SQL ID [' + sql + '] not exists');

  // 转换 params[key] 格式的参数为 params.key
  if (param && typeof param === 'object') {
    var convertedParam = {};
    
    // 只处理匹配 params[xxx] 格式的属性
    for (var key in param) {
      if (param.hasOwnProperty(key)) {
        var match = key.match(/^(\w+)\[(\w+)\]$/);
        if (match) {
          var parentKey = match[1];  // params
          var childKey = match[2];   // xxx
          
          // 创建嵌套对象
          if (!convertedParam[parentKey]) {
            convertedParam[parentKey] = {};
          }
          convertedParam[parentKey][childKey] = param[key];
          
          // 删除原始的 params[xxx] 格式键
          delete param[key];
        }
      }
    }
    
    // 深度合并 convertedParam 到 param
    for (var key in convertedParam) {
      if (convertedParam.hasOwnProperty(key)) {
        if (param[key] && typeof param[key] === 'object' && typeof convertedParam[key] === 'object') {
          // 深度合并对象属性
          for (var subKey in convertedParam[key]) {
            if (convertedParam[key].hasOwnProperty(subKey)) {
              param[key][subKey] = convertedParam[key][subKey];
            }
          }
        } else {
          param[key] = convertedParam[key];
        }
      }
    }

    if(param.params && typeof param.params === 'object') {
      // 确保必需的属性存在且不为 undefined 或 null
      if (param.params.beginTime === undefined || param.params.beginTime === null) {
        param.params.beginTime = '';
      }
      if (param.params.endTime === undefined || param.params.endTime === null) {
        param.params.endTime = '';
      }
      if (param.params.dataScope === undefined || param.params.dataScope === null) {
        param.params.dataScope = '';
      }
    }
  }

  try {
    for (var i = 0, children; children = myBatisMapper[namespace][sql][i]; i++) {
      // Convert SQL statement recursively
      statement += convert.convertChildren(children, param, namespace, myBatisMapper);
    }

    // Check not converted Parameters
    var regexList = ['\\#{\\S*}', '\\${\\S*}'];
    for (var i = 0, regexString; regexString = regexList[i]; i++) {
      var regex = new RegExp(regex, 'g');
      var checkParam = statement.match(regexString);

      if (checkParam != null && checkParam.length > 0) {
        throw new Error("Parameter " + checkParam.join(",") + " is not converted.");
      }
    }
  } catch (err) {
    throw err
  }

  return statement;
};

MybatisMapper.prototype.getMapper = function () {
  return myBatisMapper;
};

module.exports = new MybatisMapper();